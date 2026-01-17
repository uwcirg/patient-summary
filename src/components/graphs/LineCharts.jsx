import React from "react";
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
  getDotColor,
  thinTicksToFit,
} from "@config/chart_config";
import InfoDialog from "@components/InfoDialog";
import CustomLegend from "./CustomLegend";
import CustomTooltip from "./CustomTooltip";
import NullDot from "./NullDot";
import SourceDot from "./SourceDot";
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
    showTicks,
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

  const sources = React.useMemo(() => {
    const set = new Set();
    for (const d of data || []) if (d?.source) set.add(d.source);
    return Array.from(set);
  }, [data]);

  // Process data to add jitter for overlapping points on the same calendar day AND same y-value
  const processedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    // Calculate the time range of the data
    const timestamps = data.map((d) => d[xFieldKey]).filter((t) => t !== undefined && t !== null);

    if (timestamps.length === 0) return [];

    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const timeRangeMs = maxTimestamp - minTimestamp;

    // Dynamic spread width: use 0.5% of total time range, with min/max bounds
    const minSpread = 2 * 60 * 60 * 1000; // Minimum: 2 hours
    const maxSpread = 6 * 24 * 60 * 60 * 1000; // Maximum: 6 days
    const dynamicSpreadWidth = Math.max(minSpread, Math.min(maxSpread, timeRangeMs * 0.005));

    // Group by DATE AND Y-VALUE (to find true overlaps)
    const groups = {};
    data.forEach((d) => {
      const timestamp = d[xFieldKey];
      const yValue = d[yFieldKey];

      if (timestamp !== undefined && timestamp !== null && yValue !== undefined && yValue !== null) {
        // Round to start of day (midnight)
        const dateOnly = new Date(timestamp);
        dateOnly.setHours(0, 0, 0, 0);
        const dayKey = dateOnly.getTime();

        // Create composite key: date + y-value
        const compositeKey = `${dayKey}_${yValue}`;

        if (!groups[compositeKey]) groups[compositeKey] = [];
        groups[compositeKey].push(d);
      }
    });

    // Add jitter offset ONLY for points with same date AND same y-value
    return data.map((d) => {
      const timestamp = d[xFieldKey];
      const yValue = d[yFieldKey];

      if (timestamp === undefined || timestamp === null || yValue === undefined || yValue === null) {
        return d;
      }

      // Get the composite key for this point
      const dateOnly = new Date(timestamp);
      dateOnly.setHours(0, 0, 0, 0);
      const dayKey = dateOnly.getTime();
      const compositeKey = `${dayKey}_${yValue}`;

      const group = groups[compositeKey];

      // If only one point with this date+y-value combination, no jitter needed
      if (!group || group.length === 1) {
        return d;
      }

      // Multiple points with same date AND same y-value - apply jitter
      const index = group.indexOf(d);
      const offset = (index - (group.length - 1) / 2) * (dynamicSpreadWidth / group.length);

      return {
        ...d,
        [xFieldKey]: timestamp + offset,
        originalDate: timestamp, // preserve original for tooltip
        _duplicateIndex: index,
        _duplicateCount: group.length,
      };
    });
  }, [data, xFieldKey, yFieldKey]);

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

  const hasMultipleYFields = () => yLineFields && yLineFields.length > 0;

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

    const extraTopMargin = hasMultipleYFields ? 10 : 0;

    if (isSmallScreen) {
      return { top: 20 + extraTopMargin, right: 14, left: 14, bottom: 10 };
    } else if (isMediumScreen) {
      return { top: 20 + extraTopMargin, right: 20, left: 18, bottom: 10 };
    }
    return { top: 20 + extraTopMargin, right: 24, left: 20, bottom: 10 };
  };

  // Responsive X-axis height
  const xAxisHeight = isSmallScreen ? 80 : 108;

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
        xTickStyle
          ? xTickStyle
          : { style: { fontSize: isSmallScreen ? "10px" : "12px", fontWeight: 500 }, textAnchor: "middle" }
      }
      tickFormatter={xTickFormatter}
      tickMargin={showTicks ? (isSmallScreen ? 8 : 12) : 0}
      interval="preserveStartEnd"
      scale="time"
      angle={xTickLabelAngle ?? 0}
      ticks={dedupedTicks}
      padding={xAxisPadding}
    >
      {xLabel && xLabelVisible && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );

  const yDomain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];
  const yTicksToUse = yTicks || (maxYValue ? range(minYValue ?? 0, maxYValue) : range(minYValue ?? 0, 50));

  const renderYAxis = () => (
    <YAxis
      domain={yDomain}
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
      minTickGap={8}
      tickLine={{ stroke: yLabelVisible ? "#444" : "#FFF" }}
      stroke={yLabelVisible ? "#444" : "#FFF"}
      tick={
        showTicks
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
      tickMargin={showTicks ? 8 : 0}
      width={showTicks ? (isSmallScreen ? 48 : 72) : 10}
    />
  );

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

  const renderMultipleLines = () =>
    yLineFields
      .filter((item) => !enableLineSwitches || visibleLines[item.key] !== false) // Only filter if switches enabled
      .map((item, index) => (
        <Line
          {...defaultOptions}
          key={`line_${id}_${index}`}
          name={item.label ? item.label : item.key}
          type={lineType??"monotone"}
          dataKey={item.key}
          stroke={item.color}
          fill={item.fill ? item.fill : item.color}
          strokeWidth={item.strokeWidth ? item.strokeWidth : isSmallScreen ? 1.5 : 2}
          strokeDasharray={item.strokeDasharray ? item.strokeDasharray : 0}
          legendType={item.legendType ? item.legendType : "line"}
          dot={item.dot ? item.dot : { strokeDasharray: "", strokeWidth: 1 }}
          connectNulls={!!connectNulls}
        />
      ));

  const renderSingleLine = () => (
    <Line
      {...defaultOptions}
      type={lineType ?? "monotone"}
      dataKey={yFieldKey}
      stroke={theme.palette.muter.main}
      activeDot={(dotProps) => {
        const { cx, cy, payload, value, index } = dotProps;

        // source-based shapes (hover version)
        if (!isEmptyArray(sources)) {
          return (
            <SourceDot
              cx={cx}
              cy={cy}
              payload={payload}
              index={index}
              isActive
              isSmallScreen={isSmallScreen}
              sources={sources}
              xFieldKey={xFieldKey}
              yFieldKey={yFieldKey}
              params={{ r: isSmallScreen ? 4 : 5, width: isSmallScreen ? 6 : 8, height: isSmallScreen ? 6 : 8 }}
            />
          );
        }

        // fallback: severity-based active circles with duplicate coloring
        let baseColor = dotColor;
        if (payload.highSeverityScoreCutoff) {
          baseColor = value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
        }
        const color = getDotColor(payload, baseColor);

        return <circle cx={cx} cy={cy} r={isSmallScreen ? 2 : 4} fill={color} stroke="#fff" strokeWidth={2} />;
      }}
      dot={({ cx, cy, payload, value, index }) => {
        if (!isEmptyArray(sources))
          return (
            <SourceDot
              key={`${payload?.id}_${index}`}
              cx={cx}
              cy={cy}
              payload={payload}
              index={index}
              isSmallScreen={isSmallScreen}
              sources={sources}
              xFieldKey={xFieldKey}
              yFieldKey={yFieldKey}
            />
          );

        // Determine base color
        let baseColor;
        if (payload.highSeverityScoreCutoff) {
          baseColor = value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
        } else {
          baseColor = dotColor;
        }

        // Apply duplicate coloring
        const color = getDotColor(payload, baseColor);

        return (
          <circle
            key={`dot-default-${payload?.id}_${index}`}
            cx={cx}
            cy={cy}
            r={isSmallScreen ? 2 : 4}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      }}
      strokeWidth={strokeWidth ? strokeWidth : 1}
      connectNulls={!!connectNulls}
    />
  );

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
            sm: chartHeight ? chartHeight: 240,
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
  legendType: PropTypes.string,
  lineType: PropTypes.string,
  mdChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minimumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  note: PropTypes.string,
  showTicks: PropTypes.bool,
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
