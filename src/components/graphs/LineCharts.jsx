import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  LineChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Text,
  Label,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ALERT_COLOR, SUCCESS_COLOR, hexToRgba, buildClampedThinnedTicks } from "@config/chart_config";
import InfoDialog from "@components/InfoDialog";
import CustomLegend from "./CustomLegend";
import CustomSourceTooltip from "./CustomSourceTooltip";
import NullDot from "./NullDot";
import { createDotRenderer, createActiveDotRenderer } from "./ChartDotRenderers";
//import { useDismissableOverlay } from "@/hooks/useDismissableOverlay";
import { generateUUID, isEmptyArray, range } from "@/util";

export default function LineCharts(props) {
  const {
    bestMeaningLabel,
    chartMargin,
    chartHeight,
    chartWidth,
    connectNulls,
    data,
    dotColor,
    dotRadius,
    activeDotRadius,
    enableAxisMeaningLabels,
    enableLineSwitches,
    enableScoreSeverityArea,
    enableScoreSeverityCutoffLine,
    id,
    jitterSpreadDays,
    legendIconType,
    legendType,
    lineType,
    lgChartWidth,
    mdChartWidth,
    maximumYValue,
    minimumYValue,
    noDataText,
    note,
    showXTicks,
    showTooltipMeaning,
    showYTicks,
    sourceColors,
    splitBySource,
    strokeWidth,
    title,
    tooltipLabelFormatter,
    tooltipValueFormatter,
    xTickLabelAngle,
    xFieldKey,
    xLabel,
    xLabelVisible,
    xDomain,
    xTickFormatter,
    xTickStyle,
    xsChartHeight,
    xsChartWidth,
    yFieldKey,
    yLabel,
    yLabelProps,
    yLabelVisible,
    yLineFields,
    yTickFormatter,
    yTicks,
    worstMeaningLabel,
    wrapperClass,
  } = props;

  const theme = useTheme();
  const wrapperRef = React.useRef(null);
  const hoveredElementRef = React.useRef(null);
  const hideTimerRef = React.useRef(null);
  const pointerTypeRef = React.useRef("mouse"); // 'mouse' | 'touch' | 'pen'
  const lastShowAtRef = React.useRef(0);
  const [locked, setLocked] = React.useState(false); // tap-to-lock on touch

  // Add tooltip state for source-based rendering
  const [sourceTooltip, setSourceTooltip] = useState({
    visible: false,
    position: { x: 0, y: 0 },
    data: null,
    payload: null,
  });

  const [visibleLines, setVisibleLines] = useState(() => {
    // Only initialize if switches are enabled and we have multiple lines
    if (enableLineSwitches && yLineFields && yLineFields.length > 0) {
      return yLineFields.reduce((acc, field) => {
        acc[field.key] = true;
        return acc;
      }, {});
    }
    return {};
  });

  const Y_AXIS_PADDING = 0.5;
  const CUT_OFF_YEAR = 5;
  const isCategoricalY = props.isCategoricalY || false;

  const hasMultipleYFields = useCallback(() => yLineFields && yLineFields.length > 0, [yLineFields]);

  const hideTooltip = React.useCallback(() => {
    hoveredElementRef.current = null;
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setLocked(false);
    setSourceTooltip({ visible: false, position: { x: 0, y: 0 }, data: null, payload: null });
  }, []);

  // Handler for custom tooltip
  const handleDotMouseEnter = useCallback(
    (e, payload, lineName, dataKey, lineColor) => {
      pointerTypeRef.current = e?.pointerType || pointerTypeRef.current;

      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

      const pt = e?.touches?.[0] || e?.changedTouches?.[0];
      const x = e?.clientX ?? pt?.clientX ?? e?.pageX ?? 0;
      const y = e?.clientY ?? pt?.clientY ?? e?.pageY ?? 0;

      // If touch, lock so tiny moves won't flicker
      if (pointerTypeRef.current === "touch") setLocked(true);

      lastShowAtRef.current = Date.now();

      const meaningRaw = payload?.showTooltipMeaning && payload.meaning ? (payload.scoreMeaning ?? payload.label) : "";
      const meaning = meaningRaw ? meaningRaw.replace(/\|/g, "\n") : null;

      setSourceTooltip({
        visible: true,
        position: { x, y },
        data: {
          date: payload.originalDate || payload.date || payload[xFieldKey],
          value: dataKey ? payload[dataKey] : payload[yFieldKey],
          source: payload.source,
          isNull: payload.isNull || false,
          meaning: meaning || null,
          lineName: lineName || null,
          lineColor,
        },
        payload,
      });
    },
    [xFieldKey, yFieldKey],
  );

  const handleDotMouseLeave = React.useCallback(() => {
    if (pointerTypeRef.current === "touch" && locked) return;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    hideTimerRef.current = setTimeout(() => {
      const dt = Date.now() - lastShowAtRef.current;
      // grace window prevents flicker when pointer slips off dot briefly
      if (dt > 120) {
        hideTooltip();
      }
    }, 80);
  }, [hideTooltip, locked]);

  const toggleLineVisibility = (lineKey) => {
    if (!enableLineSwitches) return; // Don't toggle if switches aren't enabled

    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }));
  };

  const sources = React.useMemo(() => {
    const set = new Set();
    for (const d of data || []) if (d?.source) set.add(d.source);
    return Array.from(set);
  }, [data]);

  // Process data to add jitter for overlapping points on the same calendar day AND same y-value
  const processedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const timestamps = data.map((d) => d[xFieldKey]).filter((t) => t !== undefined && t !== null);
    if (timestamps.length === 0) return [];

    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const timeRangeMs = maxTimestamp - minTimestamp;

    // Use prop if provided, otherwise calculate dynamically
    let dynamicSpreadWidth;
    if (jitterSpreadDays !== undefined) {
      // Use fixed spread based on prop
      dynamicSpreadWidth = jitterSpreadDays * 24 * 60 * 60 * 1000;
    } else {
      // Use dynamic calculation
      const minSpread = 7 * 24 * 60 * 60 * 1000; // 7 days
      const maxSpread = 21 * 24 * 60 * 60 * 1000; // 21 days
      dynamicSpreadWidth = Math.max(minSpread, Math.min(maxSpread, timeRangeMs * 0.01));
    }

    const fieldsToCheck = hasMultipleYFields() ? yLineFields.map((f) => f.key) : [yFieldKey];

    // Group by DATE AND Y-VALUE across ALL fields
    // This creates a master list of all points at each date+value combination
    const crossLineGroups = {};

    data.forEach((d) => {
      const timestamp = d[xFieldKey];
      if (timestamp === undefined || timestamp === null) return;

      const dateOnly = new Date(timestamp);
      dateOnly.setHours(0, 0, 0, 0);
      const dayKey = dateOnly.getTime();

      fieldsToCheck.forEach((fieldKey) => {
        const yValue = d[fieldKey];
        if (yValue === undefined || yValue === null) return;

        // Create composite key WITHOUT field: just date + Y-value
        // This groups ALL substances with same date and same frequency together
        const crossLineKey = `${dayKey}_${yValue}`;

        if (!crossLineGroups[crossLineKey]) crossLineGroups[crossLineKey] = [];
        crossLineGroups[crossLineKey].push({
          dataPoint: d,
          fieldKey,
          yValue,
        });
      });
    });

    // Add X-axis jitter for points with same date AND same y-value (across all lines)
    return data.map((d) => {
      const timestamp = d[xFieldKey];
      if (timestamp === undefined || timestamp === null) return d;

      const dateOnly = new Date(timestamp);
      dateOnly.setHours(0, 0, 0, 0);
      const dayKey = dateOnly.getTime();

      const jitteredPoint = {
        ...d,
        originalDate: timestamp,
      };

      // Apply X-axis jitter for each field
      fieldsToCheck.forEach((fieldKey) => {
        const yValue = d[fieldKey];
        if (yValue === undefined || yValue === null) return;

        const crossLineKey = `${dayKey}_${yValue}`;
        const group = crossLineGroups[crossLineKey];

        if (!group || group.length === 1) {
          jitteredPoint[`${fieldKey}_jittered_x`] = timestamp;
          return;
        }

        // Find this specific field+data point in the cross-line group
        const groupIndex = group.findIndex((item) => item.dataPoint === d && item.fieldKey === fieldKey);
        if (groupIndex === -1) return;

        // Calculate X-axis jitter offset based on position in cross-line group
        const offset = (groupIndex - (group.length - 1) / 2) * (dynamicSpreadWidth / group.length);

        jitteredPoint[`${fieldKey}_jittered_x`] = timestamp + offset;
        jitteredPoint[`${fieldKey}_duplicateIndex`] = groupIndex;
        jitteredPoint[`${fieldKey}_duplicateCount`] = group.length;
      });

      return jitteredPoint;
    });
  }, [data, xFieldKey, yFieldKey, yLineFields, hasMultipleYFields, jitterSpreadDays]);

  // Filter and track if data was truncated
  const { filteredData, wasTruncated, truncationDate } = React.useMemo(() => {
    if (!processedData || processedData.length === 0) {
      return { filteredData: [], wasTruncated: false, truncationDate: null };
    }

    // Calculate cutoff years ago from today
    const yearsAgo = new Date();
    yearsAgo.setFullYear(yearsAgo.getFullYear() - CUT_OFF_YEAR);
    const cutoffTimestamp = yearsAgo.getTime();

    // Check if any data was truncated
    const hasOlderData = processedData.some((d) => {
      const timestamp = d.originalDate || d[xFieldKey];
      return timestamp < cutoffTimestamp;
    });

    // Filter data based on cutoff
    const filtered = processedData.filter((d) => {
      const timestamp = d.originalDate || d[xFieldKey];
      return timestamp >= cutoffTimestamp;
    });

    return {
      filteredData: filtered,
      wasTruncated: hasOlderData,
      truncationDate: hasOlderData ? cutoffTimestamp : null,
    };
  }, [processedData, xFieldKey]);

  const linesWithData = React.useMemo(() => {
    if (!filteredData || filteredData.length === 0 || !yLineFields || yLineFields.length === 0) {
      return new Set();
    }

    const linesFound = new Set();

    // Check each line field to see if any data points have a value for that key
    yLineFields.forEach((field) => {
      const hasData = filteredData.some((d) => d[field.key] !== null && d[field.key] !== undefined);
      if (hasData) {
        linesFound.add(field.key);
      }
    });

    return linesFound;
  }, [filteredData, yLineFields]);

  // Calculate fixed domain from cutoff to now (overrides xDomain prop if truncation is active)
  const calculatedXDomain = React.useMemo(() => {
    // If we have a custom xDomain prop and no truncation, use it
    if (xDomain && !wasTruncated) {
      return xDomain;
    }

    // Otherwise calculate domain from cutoff to now
    const now = new Date().getTime();
    const yearsAgo = new Date();
    yearsAgo.setFullYear(yearsAgo.getFullYear() - CUT_OFF_YEAR);
    const cutoffTimestamp = yearsAgo.getTime();

    // Add padding (e.g., 1 month = ~30 days)
    const paddingMs = 30 * 24 * 60 * 60 * 1000;

    const domain = [cutoffTimestamp - paddingMs, now + paddingMs];

    return domain;
  }, [xDomain, wasTruncated]);

  const nullValueData = React.useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    return filteredData.map((d) => ({
      ...d,
      [yFieldKey]: d[yFieldKey] == null || d[yFieldKey] === undefined ? 0 : null,
      isNull: d[yFieldKey] == null || d[yFieldKey] === undefined,
    }));
  }, [filteredData, yFieldKey]);

  const hasNullValues = React.useMemo(() => {
    if (!filteredData || filteredData.length === 0) return false;
    if (hasMultipleYFields()) {
      return filteredData.find((d) => yLineFields.every((field) => d[field.key] == null || d[field.key] === undefined));
    }
    return filteredData.some((d) => d[yFieldKey] === null || d[yFieldKey] === undefined);
  }, [filteredData, yFieldKey, hasMultipleYFields, yLineFields]);

  let maxYValue = maximumYValue
    ? maximumYValue
    : filteredData?.reduce((m, d) => Math.max(m, Number(d[yFieldKey] ?? -Infinity)), -Infinity);
  let minYValue = minimumYValue ?? filteredData?.reduce((min, d) => Math.min(min, d[yFieldKey]), Infinity);
  maxYValue = !filteredData || maxYValue === -Infinity ? null : maxYValue;

  const defaultOptions = {
    activeDot: false,
    dot: { strokeWidth: 2 },
    isAnimationActive: false,
    animationBegin: 350,
    legendType: legendType || "line",
  };

  const renderTitle = () => (
    <Stack direction="row" alignItems="center" justifyContent={"center"}>
      <Typography variant="subtitle1" component="h4" color="secondary" sx={{ textAlign: "center" }}>
        {title}
      </Typography>
      {note && (
        <InfoDialog
          title={`About ${title} Scoring`}
          content={note}
          buttonTitle={`Click to learn more about ${title} scoring`}
          allowHtml={true}
          buttonSize="small"
          buttonIconProps={{
            fontSize: "small",
          }}
        />
      )}
    </Stack>
  );

  // Determine effective chart width for responsive calculations
  const effectiveChartWidth = chartWidth || 580;
  const isSmallScreen = effectiveChartWidth <= 500;
  const isMediumScreen = effectiveChartWidth > 500 && effectiveChartWidth <= 780;

  // Build candidate ticks with responsive step size
  const stepMonths = isSmallScreen ? 12 : isMediumScreen ? 9 : 6;

  const ticks = React.useMemo(() => {
    return buildClampedThinnedTicks({
      domain: calculatedXDomain,
      stepMonths,
      width: effectiveChartWidth,
    });
  }, [calculatedXDomain, stepMonths, effectiveChartWidth]);

  // Deduplicate ticks by calendar day (safeguard against duplicate date labels)
  const dedupedTicks = React.useMemo(() => {
    if (!ticks) return ticks;

    const uniqueDays = new Set();
    const result = [];

    for (const tick of ticks) {
      const dateOnly = new Date(tick);
      dateOnly.setHours(0, 0, 0, 0);
      const dayKey = dateOnly.getTime();

      if (!uniqueDays.has(dayKey)) {
        uniqueDays.add(dayKey);
        result.push(tick);
      }
    }

    return result;
  }, [ticks]);

  // Responsive chart margin
  const getResponsiveMargin = () => {
    if (chartMargin) return chartMargin;

    const extraTopMargin = hasMultipleYFields() ? 16 : 0;
    const extraCategoryMargin = isCategoricalY ? 20 : 0;

    if (isSmallScreen) {
      return {
        top: 20 + extraTopMargin,
        right: 14,
        left: 14,
        bottom: 10,
      };
    } else if (isMediumScreen) {
      return {
        top: 12 + extraTopMargin,
        right: 18 + extraCategoryMargin,
        left: 18 + extraCategoryMargin,
        bottom: 10,
      };
    }
    return {
      top: 10 + extraTopMargin,
      right: 24 + extraCategoryMargin,
      left: 24 + extraCategoryMargin,
      bottom: 10,
    };
  };

  // Responsive X-axis height
  const xAxisHeight = showXTicks ? (isSmallScreen ? 80 : 108) : 0;

  // Responsive padding
  const xAxisPadding = isSmallScreen ? { left: 10, right: 10 } : { left: 20, right: 20 };

  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      height={xAxisHeight}
      domain={calculatedXDomain}
      textAnchor="end"
      type="number"
      allowDataOverflow={false}
      tick={
        showXTicks
          ? xTickStyle
            ? xTickStyle
            : { style: { fontSize: isSmallScreen ? "10px" : "12px", fontWeight: 500 }, textAnchor: "middle" }
          : false
      }
      tickFormatter={xTickFormatter}
      tickMargin={showXTicks ? (isSmallScreen ? 8 : 12) : 0}
      interval="preserveStartEnd"
      scale="time"
      angle={xTickLabelAngle ?? 0}
      ticks={dedupedTicks}
      padding={xAxisPadding}
    >
      {xLabel && xLabelVisible && <Label value={xLabel} offset={4} position="insideBottom" />}
    </XAxis>
  );

  // Calculate Y domain and ticks based on data type
  const { yDomainToUse, yTicksToUse } = React.useMemo(() => {
    if (isCategoricalY) {
      const min = minimumYValue ?? 0;
      const max = maximumYValue ?? 4;
      const padding = Y_AXIS_PADDING;

      return {
        yDomainToUse: [min - padding, max + padding],
        yTicksToUse: yTicks || range(min, max),
      };
    }

    const domain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];
    const ticks = yTicks || (maxYValue ? range(minYValue ?? 0, maxYValue) : range(minYValue ?? 0, 50));

    return {
      yDomainToUse: domain,
      yTicksToUse: ticks,
    };
  }, [isCategoricalY, minimumYValue, maximumYValue, yTicks, maxYValue, minYValue]);

  const renderYAxis = () => (
    <YAxis
      domain={yDomainToUse}
      label={
        yLabel && yLabelVisible
          ? {
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              offset: -2,
              style: { fontSize: "10px" },
              ...(yLabelProps ? yLabelProps : {}),
            }
          : null
      }
      minTickGap={isCategoricalY ? 0 : 8} // No gap for categorical to show all ticks
      tickLine={{ stroke: yLabelVisible ? "#444" : "#FFF" }}
      stroke={yLabelVisible ? "#444" : "#FFF"}
      tick={
        showYTicks
          ? (e) => {
              const configData = filteredData.find((item) => item.highSeverityScoreCutoff);
              let color = "#666";
              const {
                payload: { value },
              } = e;
              if (configData) {
                if (configData.comparisonToAlert === "lower") {
                  if (value <= parseInt(configData.highSeverityScoreCutoff)) color = ALERT_COLOR;
                } else {
                  if (value >= parseInt(configData.highSeverityScoreCutoff)) color = ALERT_COLOR;
                }
              }
              e["fill"] = color;
              e["fontSize"] = isSmallScreen ? "9px" : "10px";
              e["fontWeight"] = 500;

              // Apply the yTickFormatter here
              const displayValue = yTickFormatter ? yTickFormatter(value) : value;

              return <Text {...e}>{displayValue}</Text>;
            }
          : false
      }
      ticks={yTicksToUse}
      tickMargin={showYTicks ? 8 : 0}
      allowDataOverflow={!!isCategoricalY}
      width={showYTicks ? (isSmallScreen ? 50 : 60) : 10}
    />
  );

  const renderLegend = () => {
    if (isEmptyArray(sources)) {
      return (
        <Legend
          formatter={(value) => (
            <span style={{ marginRight: "8px", fontSize: isSmallScreen ? "10px" : "12px" }}>
              {value.replace(/_/g, " ")}
            </span>
          )}
          iconSize={isSmallScreen ? 10 : 12}
          wrapperStyle={{ bottom: isSmallScreen ? "8px" : "12px" }}
        />
      );
    }

    // Has sources - show source legend
    return (
      <Legend
        verticalAlign="top"
        align="right"
        wrapperStyle={{
          position: "absolute",
          top: isSmallScreen ? 4 : 8,
          right: isSmallScreen ? 20 : hasNullValues && hasMultipleYFields() ? 32 : 40,
          width: "auto",
        }}
        content={(legendProps) => (
          <CustomLegend
            {...legendProps}
            sources={sources}
            isSmallScreen={isSmallScreen}
            hasNullValues={hasNullValues}
            yLineFields={yLineFields}
            visibleLines={visibleLines}
            onToggleLine={toggleLineVisibility}
            enableLineSwitches={enableLineSwitches}
            linesWithData={linesWithData}
            legendIconType={legendIconType}
            noDataText={noDataText}
          />
        )}
      />
    );
  };

  const renderMultipleLines = () => {
    // Create the base configuration object (same for all lines)
    const baseDotConfig = {
      sources,
      isSmallScreen,
      xFieldKey,
      yFieldKey,
      dotRadius,
      activeDotRadius,
    };

    return yLineFields
      .filter((item) => !enableLineSwitches || visibleLines[item.key] !== false)
      .map((item, index) => {
        // Create dot config specific to this line
        const lineDotConfig = {
          ...baseDotConfig,
          dotColor: item.color, // Use the line's color as the dot color
          dotRadius: item.dotRadius ?? dotRadius,
          activeDotRadius: item.dotRadius ?? activeDotRadius,
        };

        // Use custom opacity if provided, otherwise default to 0.5
        const strokeOpacity = item.strokeOpacity !== undefined ? item.strokeOpacity : 0.5;
        const faintStroke = hexToRgba(item.color, strokeOpacity);

        // Use jittered x field if it exists, otherwise use regular xFieldKey
        const jitteredXField = `${item.key}_jittered_x`;

        // Filter out null values for this specific line
        const lineData = filteredData
          .filter((d) => d[item.key] !== null && d[item.key] !== undefined && !d[item.key].isNull)
          .map((d) => ({
            ...d,
            // Use jittered x if available, otherwise use original
            [xFieldKey]: d[jitteredXField] !== undefined ? d[jitteredXField] : d[xFieldKey],
            // Store duplicate info for this specific line
            _duplicateIndex: d[`${item.key}_duplicateIndex`],
            _duplicateCount: d[`${item.key}_duplicateCount`],
          }));

        return (
          <Line
            {...defaultOptions}
            key={`line_${id}_${item.key}_${index}`}
            name={item.label ?? item.key}
            type={lineType ? lineType : "monotone"}
            dataKey={item.key}
            // Use jittered x coordinate
            data={lineData}
            stroke={faintStroke} // Use fainter color for stroke
            fill={item.fill ? item.fill : faintStroke}
            strokeWidth={item.strokeWidth ? item.strokeWidth : isSmallScreen ? 1.5 : 2}
            strokeDasharray={item.strokeDasharray ? item.strokeDasharray : 0}
            legendType={item.legendType ? item.legendType : "line"}
            dot={(dotProps) => {
              const CustomDot = createDotRenderer(lineDotConfig);
              const { key, ...rest } = dotProps;
              return (
                <g
                  key={`${dotProps.payload?.id}_${dotProps.payload?.key}_multiline_dot`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleDotMouseEnter(e, dotProps.payload, item.label ?? item.key, item.key, item.color);
                  }}
                  onPointerEnter={(e) => {
                    e.stopPropagation();
                    handleDotMouseEnter(e, dotProps.payload, item.label ?? item.key, item.key, item.color);
                  }}
                  onPointerLeave={(e) => {
                    e.stopPropagation();
                    handleDotMouseLeave();
                  }}
                  onPointerCancel={(e) => {
                    e.stopPropagation();
                    handleDotMouseLeave();
                  }}
                >
                  <CustomDot {...rest} />
                </g>
              );
            }}
            activeDot={(dotProps) => {
              const CustomActiveDot = createActiveDotRenderer(lineDotConfig);
              const { key, ...rest } = dotProps;
              return (
                <g
                  key={`${dotProps.payload?.id}_${dotProps.payload?.key}_multiline_activedot`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleDotMouseEnter(e, dotProps.payload, item.label ?? item.key, item.key, item.color);
                  }}
                  onPointerEnter={(e) => {
                    e.stopPropagation();
                    handleDotMouseEnter(e, dotProps.payload, item.label ?? item.key, item.key, item.color);
                  }}
                  onPointerLeave={(e) => {
                    e.stopPropagation();
                    handleDotMouseLeave();
                  }}
                  onPointerCancel={(e) => {
                    e.stopPropagation();
                    handleDotMouseLeave();
                  }}
                >
                  <CustomActiveDot {...rest} />
                </g>
              );
            }}
            connectNulls={!!connectNulls}
          />
        );
      });
  };

  const renderSingleLine = () => {
    // Create the configuration object
    const dotConfig = {
      sources,
      isSmallScreen,
      xFieldKey,
      yFieldKey,
      dotColor,
      dotRadius,
      activeDotRadius,
    };
    const lineData = filteredData.filter((d) => d[yFieldKey] !== null && d[yFieldKey] !== undefined);

    return (
      <Line
        {...defaultOptions}
        type={lineType ? lineType : "monotone"}
        data={lineData} // Use filtered data
        dataKey={yFieldKey}
        stroke={theme.palette.muter.main}
        dot={(dotProps) => {
          const CustomDot = createDotRenderer(dotConfig);
          const { key, ...rest } = dotProps;
          return (
            <g
              key={`${dotProps.payload?.id}_${dotProps.payload?.key}_singleline_dot`}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, dotProps.payload);
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, dotProps.payload);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
            >
              <CustomDot {...rest} />
            </g>
          );
        }}
        activeDot={(dotProps) => {
          const CustomActiveDot = createActiveDotRenderer(dotConfig);
          const { key, ...rest } = dotProps;
          return (
            <g
              key={`${dotProps.payload?.id}_${dotProps.payload?.key}_singleline_activedot`}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, dotProps.payload);
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, dotProps.payload);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
            >
              <CustomActiveDot {...rest} />
            </g>
          );
        }}
        strokeWidth={strokeWidth ? strokeWidth : 1}
        connectNulls={!!connectNulls}
      />
    );
  };

  const renderNullLine = () => {
    // Determine the actual bottom position accounting for categorical padding
    const nullYValue = isCategoricalY ? (minimumYValue ?? 0) - Y_AXIS_PADDING / 2 : (minimumYValue ?? 0);

    // Handle multiple lines case - only show null when ALL fields are null
    if (hasMultipleYFields()) {
      // Create data where we only mark as null if ALL yLineFields are null
      const multiLineNullData = filteredData.map((d) => {
        // Check if all line fields are null for this data point
        const allFieldsNull = yLineFields.every((field) => d[field.key] == null || d[field.key] === undefined);

        return {
          ...d,
          // Force the value to be at the bottom of the chart (accounting for padding)
          [yLineFields[0].key]: allFieldsNull ? nullYValue : null,
          isNull: allFieldsNull,
        };
      });

      return (
        <Line
          key="null-line-multi"
          data={multiLineNullData}
          type="monotone"
          dataKey={yLineFields[0].key}
          stroke="transparent"
          fill="transparent"
          strokeWidth={0}
          isAnimationActive={false}
          legendType="none"
          dot={(dotProps) => {
            if (!dotProps.payload?.isNull) return null;
            const { cx, cy, payload, index } = dotProps;
            return (
              <g
                key={`${payload?.id}_${payload?.key}_${index}_nulldot`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, payload);
                }}
                onPointerEnter={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, payload);
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
              >
                <NullDot key={`null-${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />
              </g>
            );
          }}
          activeDot={(dotProps) => {
            if (!dotProps.payload?.isNull) return null;
            const { cx, cy, payload, index } = dotProps;
            return (
              <g
                key={`${payload?.id}_${payload?.key}_activenulldot`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, payload);
                }}
                onPointerEnter={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, payload);
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
              >
                <NullDot key={`null-${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />
              </g>
            );
          }}
          connectNulls={false}
        />
      );
    }

    // Handle single line case - also ensure it's at the bottom accounting for padding
    const singleLineNullData = nullValueData.map((d) => ({
      ...d,
      [yFieldKey]: d.isNull ? nullYValue : null,
    }));

    return (
      <Line
        data={singleLineNullData}
        type="monotone"
        dataKey={yFieldKey}
        stroke="transparent"
        fill="transparent"
        strokeWidth={0}
        isAnimationActive={false}
        legendType="none"
        dot={(dotProps) => {
          if (!dotProps.payload?.isNull) return null;
          const { cx, cy, payload, index } = dotProps;
          return (
            <g
              key={`${payload?.id}_${payload?.key}_${index}_nulldot`}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, payload);
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, payload);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
            >
              <NullDot key={`null-${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />
            </g>
          );
        }}
        activeDot={(dotProps) => {
          if (!dotProps.payload?.isNull) return null;
          const { cx, cy, payload, index } = dotProps;
          return (
            <g
              key={`${payload?.id}_${payload?.key}_activenulldot`}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, payload);
              }}
              onPointerEnter={(e) => {
                e.stopPropagation();
                handleDotMouseEnter(e, payload);
              }}
              onPointerLeave={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
              onPointerCancel={(e) => {
                e.stopPropagation();
                handleDotMouseLeave();
              }}
            >
              <NullDot key={`null-${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />
            </g>
          );
        }}
        connectNulls={false}
      />
    );
  };

  // Get unique sources from data
  const uniqueSources = React.useMemo(() => {
    const sourceSet = new Set();
    filteredData.forEach((d) => {
      if (d.source) sourceSet.add(d.source);
    });
    return Array.from(sourceSet);
  }, [filteredData]);

  const renderLinesBySource = () => {
    if (uniqueSources.length === 0) {
      return renderSingleLine();
    }

    const colorsToUse = sourceColors ? sourceColors : {};

    return uniqueSources.map((source, index) => {
      const sourceData = filteredData.filter(
        (d) => d.source === source && d[yFieldKey] !== null && d[yFieldKey] !== undefined,
      );

      const sourceColor = colorsToUse[source] || theme.palette.muter.main;
      const faintStroke = hexToRgba(sourceColor, 0.6);

      const lineDotConfig = {
        sources: [source],
        isSmallScreen,
        xFieldKey,
        yFieldKey,
        dotRadius,
        activeDotRadius,
      };

      return (
        <Line
          {...defaultOptions}
          key={`line-source-${source}-${index}`}
          name={source}
          type="monotone"
          dataKey={yFieldKey}
          data={sourceData}
          stroke={faintStroke}
          fill={faintStroke}
          strokeWidth={strokeWidth ? strokeWidth : isSmallScreen ? 1 : 1.5}
          dot={(dotProps) => {
            const CustomDot = createDotRenderer(lineDotConfig);
            const { key, ...rest } = dotProps;
            return (
              <g
                key={`${dotProps.payload?.id}_${dotProps.payload?.key}_dot`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, dotProps.payload);
                }}
                onPointerEnter={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, dotProps.payload);
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
              >
                <CustomDot {...rest} />
              </g>
            );
          }}
          activeDot={(dotProps) => {
            const CustomActiveDot = createActiveDotRenderer(lineDotConfig);
            const { key, ...rest } = dotProps;
            return (
              <g
                key={`${dotProps.payload?.id}_${dotProps.payload?.key}_activedot`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, dotProps.payload);
                }}
                onPointerEnter={(e) => {
                  e.stopPropagation();
                  handleDotMouseEnter(e, dotProps.payload);
                }}
                onPointerLeave={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  handleDotMouseLeave();
                }}
              >
                <CustomActiveDot {...rest} />
              </g>
            );
          }}
          connectNulls={!!connectNulls}
        />
      );
    });
  };

  const renderMinScoreMeaningLabel = () => {
    if (!maxYValue) return null;
    if (!filteredData || !filteredData.length) return null;
    const configData = filteredData.find((item) => item && item.comparisonToAlert) ?? {};
    return (
      <ReferenceLine
        y={0}
        stroke={configData.comparisonToAlert === "lower" ? ALERT_COLOR : SUCCESS_COLOR}
        strokeWidth={0}
      >
        <Label
          value={
            configData.comparisonToAlert === "lower" ? (worstMeaningLabel ?? "Worst") : (bestMeaningLabel ?? "Best")
          }
          fontSize={isSmallScreen ? "10px" : "12px"}
          fontWeight={500}
          fill={configData.comparisonToAlert === "lower" ? ALERT_COLOR : SUCCESS_COLOR}
          position="insideTopLeft"
          dx={-12}
        />
      </ReferenceLine>
    );
  };

  const renderMaxScoreMeaningLabel = () => {
    if (!maxYValue) return null;
    if (!filteredData || !filteredData.length) return null;
    const configData = filteredData.find((item) => item && item.comparisonToAlert) ?? {};
    return (
      <ReferenceLine
        y={maxYValue}
        x={100}
        stroke={configData.comparisonToAlert === "lower" ? SUCCESS_COLOR : ALERT_COLOR}
        strokeWidth={0}
      >
        <Label
          value={
            configData.comparisonToAlert === "lower" ? (bestMeaningLabel ?? "Best") : (worstMeaningLabel ?? "Worst")
          }
          fontSize={isSmallScreen ? "10px" : "12px"}
          fontWeight={500}
          fill={configData.comparisonToAlert === "lower" ? SUCCESS_COLOR : ALERT_COLOR}
          position="insideBottomLeft"
          dx={-12}
        />
      </ReferenceLine>
    );
  };

  const renderScoreSeverityCutoffLine = () => {
    if (!maxYValue) return null;
    if (!filteredData || !filteredData.length) return null;
    const configData = filteredData.find((item) => item && item.highSeverityScoreCutoff);
    if (!configData) return null;
    return (
      <ReferenceLine
        y={configData.highSeverityScoreCutoff}
        stroke={ALERT_COLOR}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
    );
  };

  const renderScoreSeverityArea = () => {
    if (!maxYValue) return null;
    if (!filteredData || !filteredData.length) return null;
    const configData = filteredData.find((item) => item && item.highSeverityScoreCutoff);
    if (!configData) return null;
    if (configData.comparisonToAlert === "lower") {
      return <ReferenceArea y2={configData.highSeverityScoreCutoff} fill="#FCE3DA" fillOpacity={0.3} />;
    }
    return <ReferenceArea y1={configData.highSeverityScoreCutoff} fill="#FCE3DA" fillOpacity={0.3} />;
  };

  const renderTruncationLine = () => {
    if (!wasTruncated || !truncationDate) return null;

    return (
      <ReferenceLine
        x={truncationDate}
        stroke="#999"
        strokeWidth={2}
        strokeDasharray="3 3"
        label={{
          value: "data truncated",
          position: "top",
          fill: "#666",
          fontSize: isSmallScreen ? 10 : 12,
          fontWeight: 500,
        }}
      />
    );
  };

  const MIN_CHART_WIDTH = xsChartWidth || 400;

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // useDismissableOverlay({ wrapperRef, onDismiss: hideTooltip });

  return (
    <>
      {renderTitle()}
      <Box
        ref={wrapperRef}
        sx={{
          width: {
            xs: MIN_CHART_WIDTH,
            sm: chartWidth || 580,
            md: mdChartWidth || chartWidth || 580,
            lg: lgChartWidth || chartWidth || 580,
          },
          height: {
            xs: xsChartHeight ? xsChartHeight : 280, // Increased height for small screens
            sm: chartHeight ? chartHeight : 240,
          },
        }}
        className={`chart-wrapper ${wrapperClass ? wrapperClass : ""}`}
        onPointerDown={(e) => {
          pointerTypeRef.current = e.pointerType || pointerTypeRef.current;
          // tap inside chart (not a dot) closes on touch
          if (pointerTypeRef.current === "touch") {
            setLocked(false);
            hideTooltip();
          }
        }}
        onPointerLeave={hideTooltip}
        onPointerCancel={hideTooltip}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <LineChart data={filteredData} margin={getResponsiveMargin()} id={`lineChart_${id ?? generateUUID()}`}>
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderXAxis()}
            {renderYAxis()}
            {renderTruncationLine()}
            {enableScoreSeverityCutoffLine && renderScoreSeverityCutoffLine()}
            {enableScoreSeverityArea && renderScoreSeverityArea()}
            {/* {renderToolTip()} */}
            {renderLegend()}
            {hasMultipleYFields() && renderMultipleLines()}
            {!hasMultipleYFields() && (splitBySource ? renderLinesBySource() : renderSingleLine())}
            {renderNullLine()}
            {enableAxisMeaningLabels && renderMaxScoreMeaningLabel()}
            {enableAxisMeaningLabels && renderMinScoreMeaningLabel()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <CustomSourceTooltip
        visible={sourceTooltip.visible}
        position={sourceTooltip.position}
        data={sourceTooltip.data}
        tooltipLabelFormatter={tooltipLabelFormatter}
        tooltipValueFormatter={tooltipValueFormatter}
        xFieldKey={xFieldKey}
        yFieldKey={yFieldKey}
        yLabel={yLabel}
        showMeaning={showTooltipMeaning}
        noDataText={noDataText}
      />
    </>
  );
}

LineCharts.propTypes = {
  bestMeaningLabel: PropTypes.string,
  chartMargin: PropTypes.object,
  chartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chartHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  connectNulls: PropTypes.bool,
  data: PropTypes.array,
  dotColor: PropTypes.string,
  dotRadius: PropTypes.number,
  activeDotRadius: PropTypes.number,
  enableAxisMeaningLabels: PropTypes.bool,
  enableScoreSeverityArea: PropTypes.bool,
  enableScoreSeverityCutoffLine: PropTypes.bool,
  enableLineSwitches: PropTypes.bool,
  highSeverityScoreCutoff: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isCategoricalY: PropTypes.bool,
  jitterSpreadDays: PropTypes.number,
  legendIconType: PropTypes.oneOf(["line", "circle"]),
  legendType: PropTypes.string,
  lineType: PropTypes.string,
  mdChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  noDataText: PropTypes.string,
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minimumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  note: PropTypes.string,
  showTooltipMeaning: PropTypes.bool,
  showXTicks: PropTypes.bool,
  showYTicks: PropTypes.bool,
  sourceColors: PropTypes.object,
  splitBySource: PropTypes.bool,
  strokeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  tooltipLabelFormatter: PropTypes.func,
  tooltipValueFormatter: PropTypes.func,
  xDomain: PropTypes.array,
  xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xLabel: PropTypes.string,
  xTickLabelAngle: PropTypes.number,
  xTickFormatter: PropTypes.func,
  xTickStyle: PropTypes.object,
  xsChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xsChartHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLabel: PropTypes.string,
  xLabelVisible: PropTypes.bool,
  yLabelProps: PropTypes.object,
  yLabelVisible: PropTypes.bool,
  yLineFields: PropTypes.array,
  yTickFormatter: PropTypes.func,
  yTicks: PropTypes.array,
  worstMeaningLabel: PropTypes.string,
  wrapperClass: PropTypes.string,
};
