import React, { useCallback } from "react";
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
  Tooltip,
  Label,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ALERT_COLOR,
  SUCCESS_COLOR,
  buildTimeTicks,
  fmtMonthYear,
  hexToRgba,
  thinTicksToFit,
} from "@config/chart_config";
import InfoDialog from "@components/InfoDialog";
import CustomLegend from "./CustomLegend";
import CustomTooltip from "./CustomTooltip";
import NullDot from "./NullDot";
import { createDotRenderer, createActiveDotRenderer } from "./ChartDotRenderers";
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
    enableAxisMeaningLabels,
    enableLineSwitches,
    enableScoreSeverityArea,
    enableScoreSeverityCutoffLine,
    id,
    legendType,
    lineType,
    lgChartWidth,
    mdChartWidth,
    maximumYValue,
    minimumYValue,
    note,
    showXTicks,
    showYTicks,
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
  const CUT_OFF_YEAR = 5;
  const isCategoricalY = props.isCategoricalY || false;

  const [visibleLines, setVisibleLines] = React.useState(() => {
    // Only initialize if switches are enabled and we have multiple lines
    if (enableLineSwitches && yLineFields && yLineFields.length > 0) {
      return yLineFields.reduce((acc, field) => {
        acc[field.key] = true;
        return acc;
      }, {});
    }
    return {};
  });

  const toggleLineVisibility = (lineKey) => {
    if (!enableLineSwitches) return; // Don't toggle if switches aren't enabled

    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }));
  };

  const hasMultipleYFields = useCallback(() => yLineFields && yLineFields.length > 0, [yLineFields]);

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

    const minSpread = 2 * 60 * 60 * 1000;
    const maxSpread = 6 * 24 * 60 * 60 * 1000;
    const dynamicSpreadWidth = Math.max(minSpread, Math.min(maxSpread, timeRangeMs * 0.005));

    const fieldsToCheck = hasMultipleYFields() ? yLineFields.map((f) => f.key) : [yFieldKey];

    // Group by DATE AND Y-VALUE for each field
    const groups = {};

    data.forEach((d) => {
      const timestamp = d[xFieldKey];
      if (timestamp === undefined || timestamp === null) return;

      const dateOnly = new Date(timestamp);
      dateOnly.setHours(0, 0, 0, 0);
      const dayKey = dateOnly.getTime();

      fieldsToCheck.forEach((fieldKey) => {
        const yValue = d[fieldKey];
        if (yValue === undefined || yValue === null) return;

        // Create composite key: field + date + Y-VALUE
        // This groups points with same date
        const compositeKey = `${fieldKey}_${dayKey}_${yValue}`;

        if (!groups[compositeKey]) groups[compositeKey] = [];
        groups[compositeKey].push({ dataPoint: d, fieldKey, yValue });
      });
    });

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

      fieldsToCheck.forEach((fieldKey) => {
        const yValue = d[fieldKey];
        if (yValue === undefined || yValue === null) return;

        const compositeKey = `${fieldKey}_${dayKey}_${yValue}`;
        const group = groups[compositeKey];

        if (!group || group.length === 1) {
          jitteredPoint[`${fieldKey}_jittered_x`] = timestamp;
          return;
        }

        const groupIndex = group.findIndex((item) => item.dataPoint === d);
        if (groupIndex === -1) return;

        // Apply X-axis jitter only
        const offset = (groupIndex - (group.length - 1) / 2) * (dynamicSpreadWidth / group.length);
        jitteredPoint[`${fieldKey}_jittered_x`] = timestamp + offset;
        jitteredPoint[`${fieldKey}_duplicateIndex`] = groupIndex;
        jitteredPoint[`${fieldKey}_duplicateCount`] = group.length;
      });

      return jitteredPoint;
    });
  }, [data, xFieldKey, yFieldKey, yLineFields, hasMultipleYFields]);

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
    return filteredData.some((d) => d[yFieldKey] === null || d[yFieldKey] === undefined);
  }, [filteredData, yFieldKey]);

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

  const uniqSorted = (arr) => {
    if (!Array.isArray(arr)) return arr;
    const s = new Set();
    for (const v of arr) if (Number.isFinite(v)) s.add(v);
    return Array.from(s).sort((a, b) => a - b);
  };

  // Determine effective chart width for responsive calculations
  const effectiveChartWidth = chartWidth || 580;
  const isSmallScreen = effectiveChartWidth <= 450;
  const isMediumScreen = effectiveChartWidth > 450 && effectiveChartWidth <= 580;

  // Build candidate ticks with responsive step size
  const tickStep = isSmallScreen ? 12 : isMediumScreen ? 9 : 6;

  const allTicksRaw =
    Array.isArray(calculatedXDomain) && typeof calculatedXDomain[0] === "number"
      ? buildTimeTicks(calculatedXDomain, { unit: "month", step: tickStep })
      : undefined;

  // 1) Ensure numeric & unique; 2) Clamp to domain; 3) Sort; 4) Thin to fit; 5) Dedupe again
  const clampedAll = allTicksRaw
    ? allTicksRaw.filter((t) => t >= calculatedXDomain[0] && t <= calculatedXDomain[1])
    : undefined;

  const allTicks = clampedAll ? uniqSorted(clampedAll) : undefined;

  const ticksRaw = allTicks
    ? thinTicksToFit(allTicks, (ms) => fmtMonthYear.format(ms), effectiveChartWidth)
    : undefined;

  // Final ticks to render (unique & sorted)
  const ticks = ticksRaw ? uniqSorted(ticksRaw) : undefined;

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

    const extraTopMargin = hasMultipleYFields() ? 10 : 0;

    if (isSmallScreen) {
      return {
        top: 20 + extraTopMargin,
        right: 14,
        left: 14,
        bottom: 10,
      };
    } else if (isMediumScreen) {
      return {
        top: 20 + extraTopMargin,
        right: 18,
        left: 18,
        bottom: 10,
      };
    }
    return {
      top: 20 + extraTopMargin,
      right: 24,
      left: 24,
      bottom: 10,
    };
  };

  // Responsive X-axis height
  const xAxisHeight = showXTicks ? (isSmallScreen ? 80 : 108) : 0;

  // Responsive padding
  const xAxisPadding = isSmallScreen ? { left: 10, right: 10 } : { left: 16, right: 16 };

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
      const padding = 0.15;

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

  // const yDomain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];
  // const yTicksToUse = yTicks || (maxYValue ? range(minYValue ?? 0, maxYValue) : range(minYValue ?? 0, 50));

  const renderYAxis = () => (
    <YAxis
      domain={yDomainToUse}
      label={
        yLabel && yLabelVisible
          ? {
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              style: { fontSize: isSmallScreen ? "10px" : "12px" },
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

  const lineColorMap = React.useMemo(() => {
    if (!yLineFields || yLineFields.length === 0) return {};

    return yLineFields.reduce((map, field) => {
      map[field.key] = hexToRgba(field.color, 1);
      return map;
    }, {});
  }, [yLineFields]);

  const renderToolTip = () => (
    <Tooltip
      itemStyle={{ fontSize: "10px" }}
      labelStyle={{ fontSize: "10px" }}
      animationBegin={0}
      animationDuration={0}
      shared={false}
      // Use originalDate in tooltip if available
      labelFormatter={(value, payload) => {
        if (tooltipLabelFormatter) {
          const originalValue = payload?.[0]?.payload?.originalDate ?? value;
          return tooltipLabelFormatter(originalValue, payload);
        }
        return value;
      }}
      content={(props) => (
        <CustomTooltip
          {...props}
          yFieldKey={yFieldKey}
          xFieldKey={xFieldKey}
          xLabelKey="originalDate"
          yLabel={yLabel}
          tooltipValueFormatter={tooltipValueFormatter}
          lineColorMap={lineColorMap}
        />
      )}
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
          top: isSmallScreen ? 4 : 10,
          right: isSmallScreen ? 20 : 24,
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
    };

    return yLineFields
      .filter((item) => !enableLineSwitches || visibleLines[item.key] !== false)
      .map((item, index) => {
        // Create dot config specific to this line
        const lineDotConfig = {
          ...baseDotConfig,
          dotColor: item.color, // Use the line's color as the dot color
        };

        // Use custom opacity if provided, otherwise default to 0.5
        const strokeOpacity = item.strokeOpacity !== undefined ? item.strokeOpacity : 0.5;
        const faintStroke = hexToRgba(item.color, strokeOpacity);

        // Use jittered x field if it exists, otherwise use regular xFieldKey
        const jitteredXField = `${item.key}_jittered_x`;

        return (
          <Line
            {...defaultOptions}
            key={`line_${id}_${index}`}
            name={item.label ? item.label : item.key}
            type={lineType ? lineType : "monotone"}
            dataKey={item.key}
            // Use jittered x coordinate
            data={filteredData.map((d) => ({
              ...d,
              // Use jittered x if available, otherwise use original
              [xFieldKey]: d[jitteredXField] !== undefined ? d[jitteredXField] : d[xFieldKey],
              // Store duplicate info for this specific line
              _duplicateIndex: d[`${item.key}_duplicateIndex`],
              _duplicateCount: d[`${item.key}_duplicateCount`],
            }))}
            stroke={faintStroke} // Use fainter color for stroke
            fill={item.fill ? item.fill : faintStroke}
            strokeWidth={item.strokeWidth ? item.strokeWidth : isSmallScreen ? 1.5 : 2}
            strokeDasharray={item.strokeDasharray ? item.strokeDasharray : 0}
            legendType={item.legendType ? item.legendType : "line"}
            dot={createDotRenderer(lineDotConfig)} // Use extracted dot renderer
            activeDot={createActiveDotRenderer(lineDotConfig)} // Use extracted active dot renderer
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
    };

    return (
      <Line
        {...defaultOptions}
        type={lineType ? lineType : "monotone"}
        dataKey={yFieldKey}
        stroke={theme.palette.muter.main}
        activeDot={createActiveDotRenderer(dotConfig)}
        dot={createDotRenderer(dotConfig)}
        strokeWidth={strokeWidth ? strokeWidth : 1}
        connectNulls={!!connectNulls}
      />
    );
  };

  const renderNullLine = () => (
    <Line
      data={nullValueData}
      type="monotone"
      dataKey={yFieldKey}
      stroke="transparent"
      fill="transparent"
      strokeWidth={0}
      isAnimationActive={false}
      legendType="none"
      dot={({ cx, cy, payload, index }) => {
        if (!payload.isNull) return null;
        return <NullDot key={`null-${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />;
      }}
      activeDot={false}
      connectNulls={false}
    />
  );

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

  return (
    <>
      {renderTitle()}
      <Box
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
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <LineChart data={filteredData} margin={getResponsiveMargin()} id={`lineChart_${id ?? generateUUID()}`}>
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderXAxis()}
            {renderYAxis()}
            {renderTruncationLine()}
            {enableScoreSeverityCutoffLine && renderScoreSeverityCutoffLine()}
            {enableScoreSeverityArea && renderScoreSeverityArea()}
            {renderToolTip()}
            {renderLegend()}
            {hasMultipleYFields() && renderMultipleLines()}
            {!hasMultipleYFields() && renderSingleLine()}
            {renderNullLine()}
            {enableAxisMeaningLabels && renderMaxScoreMeaningLabel()}
            {enableAxisMeaningLabels && renderMinScoreMeaningLabel()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
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
  enableAxisMeaningLabels: PropTypes.bool,
  enableScoreSeverityArea: PropTypes.bool,
  enableScoreSeverityCutoffLine: PropTypes.bool,
  enableLineSwitches: PropTypes.bool,
  highSeverityScoreCutoff: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isCategoricalY: PropTypes.bool,
  legendType: PropTypes.string,
  lineType: PropTypes.string,
  mdChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minimumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  note: PropTypes.string,
  showXTicks: PropTypes.bool,
  showYTicks: PropTypes.bool,
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
