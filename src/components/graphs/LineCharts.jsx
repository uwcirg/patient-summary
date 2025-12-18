import React from "react";
import PropTypes from "prop-types";
import { Typography, Box } from "@mui/material";
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
  WARNING_COLOR,
  buildTimeTicks,
  fmtMonthYear,
  thinTicksToFit,
} from "@config/chart_config";
import CustomTooltip from "./CustomTooltip";
import { generateUUID, isEmptyArray, range } from "@/util";

export default function LineCharts(props) {
  const {
    chartHeight,
    chartWidth,
    data,
    dotColor,
    enableAxisMeaningLabels,
    enableScoreSeverityArea,
    enableScoreSeverityCutoffLine,
    id,
    legendType,
    lgChartWidth,
    mdChartWidth,
    maximumYValue,
    minimumYValue,
    showTicks,
    strokeWidth,
    title,
    tooltipLabelFormatter,
    xTickLabelAngle,
    xFieldKey,
    xLabel,
    xLabelVisible,
    xDomain,
    xTickFormatter,
    xTickStyle,
    xsChartWidth,
    yFieldKey,
    yLabel,
    yLabelVisible,
    yLineFields,
    yTickFormatter,
  } = props;

  const theme = useTheme();
  const CUT_OFF_YEAR = 5;

  const sources = React.useMemo(() => {
    const set = new Set();
    for (const d of data || []) if (d?.source) set.add(d.source);
    return Array.from(set);
  }, [data]);

  const getDotColor = (entry, baseColor) => {
    // If no duplicates on this day, use base color
    if (!entry._duplicateCount || entry._duplicateCount === 1) {
      return baseColor;
    }

    // For duplicates, adjust the brightness based on index
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : null;
    };

    const rgbToHex = (r, g, b) => {
      return (
        "#" +
        [r, g, b]
          .map((x) => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
          })
          .join("")
      );
    };

    const adjustBrightness = (color, amount) => {
      const rgb = hexToRgb(color);
      if (!rgb) return color;

      return rgbToHex(
        Math.min(255, Math.max(0, rgb.r + amount)),
        Math.min(255, Math.max(0, rgb.g + amount)),
        Math.min(255, Math.max(0, rgb.b + amount)),
      );
    };

    // Adjust brightness: first dot darker, last dot lighter
    const brightnessStep = 5; // Adjust this value for more/less variation
    const adjustment = (entry._duplicateIndex - Math.floor(entry._duplicateCount / 2)) * brightnessStep;

    return adjustBrightness(baseColor, adjustment);
  };

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

    console.log("LineChart - Dynamic spread calculation:", {
      timeRangeDays: (timeRangeMs / (24 * 60 * 60 * 1000)).toFixed(1),
      spreadWidthHours: (dynamicSpreadWidth / (60 * 60 * 1000)).toFixed(1),
    });

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

  // Calculate fixed domain from cutoff to now (overrides xDomain prop if truncation is active)
  const calculatedXDomain = React.useMemo(() => {
    // If we have a custom xDomain prop and no truncation, use it
    if (xDomain && !wasTruncated) return xDomain;

    // Otherwise calculate domain from cutoff to now
    const now = new Date().getTime();
    const yearsAgo = new Date();
    yearsAgo.setFullYear(yearsAgo.getFullYear() - CUT_OFF_YEAR);
    const cutoffTimestamp = yearsAgo.getTime();

    // Add padding (e.g., 1 month = ~30 days)
    const paddingMs = 30 * 24 * 60 * 60 * 1000;

    return [cutoffTimestamp - paddingMs, now + paddingMs];
  }, [xDomain, wasTruncated]);

  // React.useEffect(() => {
  //   console.log("LineChart - Truncation Debug:", {
  //     originalDataLength: processedData?.length,
  //     filteredDataLength: filteredData?.length,
  //     wasTruncated,
  //     truncationDate: truncationDate ? new Date(truncationDate).toLocaleDateString() : null,
  //     oldestDataPoint: processedData?.[0]
  //       ? new Date(processedData[0].originalDate || processedData[0][xFieldKey]).toLocaleDateString()
  //       : null,
  //   });
  // }, [processedData, filteredData, wasTruncated, truncationDate, xFieldKey]);

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
    <Typography variant="subtitle1" component="h4" color="secondary" sx={{ textAlign: "center", marginTop: 1 }}>
      {title}
    </Typography>
  );

  const uniqSorted = (arr) => {
    if (!Array.isArray(arr)) return arr;
    const s = new Set();
    for (const v of arr) if (Number.isFinite(v)) s.add(v);
    return Array.from(s).sort((a, b) => a - b);
  };

  // Build candidate ticks (months every 6) only when we have a numeric domain
  const allTicksRaw =
    Array.isArray(calculatedXDomain) && typeof calculatedXDomain[0] === "number"
      ? buildTimeTicks(calculatedXDomain, { unit: "month", step: 6 })
      : undefined;

  // 1) Ensure numeric & unique; 2) Clamp to domain; 3) Sort; 4) Thin to fit; 5) Dedupe again (belt & suspenders)
  const clampedAll = allTicksRaw
    ? allTicksRaw.filter((t) => t >= calculatedXDomain[0] && t <= calculatedXDomain[1])
    : undefined;

  const allTicks = clampedAll ? uniqSorted(clampedAll) : undefined;

  const ticksRaw = allTicks ? thinTicksToFit(allTicks, (ms) => fmtMonthYear.format(ms), chartWidth) : undefined;

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

  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      height={108}
      domain={calculatedXDomain}
      textAnchor="end"
      type="number"
      allowDataOverflow={false}
      tick={xTickStyle ? xTickStyle : { style: { fontSize: "12px", fontWeight: 500 }, textAnchor: "middle" }}
      tickFormatter={xTickFormatter}
      tickMargin={12}
      interval="preserveStartEnd"
      scale="time"
      angle={xTickLabelAngle ?? 0}
      connectNulls={false}
      ticks={dedupedTicks}
    >
      {xLabel && xLabelVisible && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );

  const yDomain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];
  const yTicks = maxYValue ? range(minYValue ?? 0, maxYValue) : range(minYValue ?? 0, 50);

  // ----- KEY-SAFE CUSTOM DOT WITH STROKE -----
  const SourceDot = ({ cx, cy, payload, index, params }) => {
    if (isEmptyArray(sources)) return null;
    if (cx == null || cy == null) return null;
    const useParams = params ? params : {};

    // Determine base color first
    let baseColor;
    if (payload.highSeverityScoreCutoff && payload[yFieldKey] >= payload.highSeverityScoreCutoff)
      baseColor = ALERT_COLOR;
    else if (payload.mediumSeverityScoreCutoff && payload[yFieldKey] >= payload.mediumSeverityScoreCutoff)
      baseColor = WARNING_COLOR;
    else baseColor = SUCCESS_COLOR;

    // Apply duplicate coloring
    const color = getDotColor(payload, baseColor);

    const k = `dot-${payload?.id}_${payload?.key}_${payload?.source}-${payload?.[xFieldKey]}-${index}`;

    // White stroke for better visibility
    const strokeColor = "#fff";
    const strokeWidth = 2;

    switch (payload.source) {
      case "cnics":
        return (
          <circle
            key={k}
            cx={cx}
            cy={cy}
            r={useParams.r ?? 4}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      case "epic":
        return (
          <rect
            key={k}
            x={cx - (useParams.width ?? 8) / 2}
            y={cy - (useParams.height ?? 8) / 2}
            width={useParams.width ?? 8}
            height={useParams.height ?? 8}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      default:
        return (
          <circle
            key={k}
            cx={cx}
            cy={cy}
            r={useParams.r ?? 4}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
    }
  };

  SourceDot.propTypes = {
    cx: PropTypes.number,
    cy: PropTypes.number,
    payload: PropTypes.object,
    index: PropTypes.number,
    params: PropTypes.object,
  };
  // --------------------------------

  const renderYAxis = () => (
    <YAxis
      domain={yDomain}
      label={yLabel && yLabelVisible ? { value: yLabel, angle: -90, position: "insideLeft" } : null}
      minTickGap={8}
      tickLine={{ stroke: "#FFF" }}
      stroke="#FFF"
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
              e["fontSize"] = "12px";
              e["fontWeight"] = 500;
              return <Text {...e}>{value}</Text>;
            }
          : false
      }
      tickFormatter={yTickFormatter}
      ticks={yTicks}
      tickMargin={8}
    />
  );

  const renderToolTip = () => (
    <Tooltip
      itemStyle={{ fontSize: "10px" }}
      labelStyle={{ fontSize: "10px" }}
      animationBegin={500}
      animationDuration={550}
      // Use originalDate in tooltip if available
      labelFormatter={(value, payload) => {
        if (tooltipLabelFormatter) {
          // eslint-disable-next-line
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
        />
      )}
    />
  );

  const renderLegend = () => {
    if (isEmptyArray(sources)) {
      return (
        <Legend
          formatter={(value) => (
            <span style={{ marginRight: "8px", fontSize: "14px" }}>{value.replace(/_/g, " ")}</span>
          )}
          iconSize={12}
          wrapperStyle={{ bottom: "12px" }}
        />
      );
    }

    // show SourceLegend only if cnics or epic exists
    return (
      <Legend
        verticalAlign="top"
        align="right"
        wrapperStyle={{
          position: "absolute",
          top: 10,
          right: 36,
          width: "auto",
        }}
        content={(legendProps) => <SourceLegend {...legendProps} sources={sources} />}
      />
    );
  };

  const SourceLegend = () => {
    const hasCnics = sources.includes("cnics");
    const hasEpic = sources.includes("epic");
    let items = [];
    if (hasCnics) {
      items.push({
        key: "cnics",
        label: "CNICS",
        icon: (
          <svg width="16" height="16">
            <circle cx="8" cy="8" r="4" fill="#444" stroke="#fff" strokeWidth="2" />
          </svg>
        ),
      });
    }
    if (hasEpic) {
      items.push({
        key: "epic",
        label: "Epic",
        icon: (
          <svg width="16" height="16">
            <rect x="4" y="4" width="8" height="8" fill="#444" stroke="#fff" strokeWidth="2" />
          </svg>
        ),
      });
    }

    return (
      <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "4px 8px" }}>
        {items.map((it) => (
          <div
            key={it.key}
            style={{ display: "flex", gap: 2, alignItems: "center" }}
            aria-label={`${it.label} legend item`}
          >
            {it.icon}
            <span style={{ fontSize: 12, color: "#444" }}>{it.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderMultipleLines = () =>
    yLineFields.map((item, index) => (
      <Line
        {...defaultOptions}
        key={`line_${id}_${index}`}
        name={item.key}
        type="monotone"
        dataKey={item.key}
        stroke={item.color}
        strokeWidth={item.strokeWidth ? item.strokeWidth : 2}
        strokeDasharray={item.strokeDasharray ? item.strokeDasharray : 0}
        legendType={item.legendType ? item.legendType : "line"}
        dot={item.dot ? item.dot : { strokeDasharray: "", strokeWidth: 2 }}
      />
    ));

  const renderSingleLine = () => (
    <Line
      {...defaultOptions}
      type="monotone"
      dataKey={yFieldKey}
      stroke={theme.palette.primary.main}
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
              params={{ r: 5, width: 9, height: 9 }}
            />
          );
        }

        // fallback: severity-based active circles with duplicate coloring
        let baseColor = dotColor;
        // eslint-disable-next-line
        if (payload.highSeverityScoreCutoff) {
          // eslint-disable-next-line
          baseColor = value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
        }
        const color = getDotColor(payload, baseColor);

        return <circle cx={cx} cy={cy} r={5} fill={color} stroke="#fff" strokeWidth={2} />;
      }}
      dot={({ cx, cy, payload, value, index }) => {
        if (!isEmptyArray(sources))
          // eslint-disable-next-line
          return <SourceDot key={`${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />;

        // Determine base color
        let baseColor;
        // eslint-disable-next-line
        if (payload.highSeverityScoreCutoff) {
          // eslint-disable-next-line
          baseColor = value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
        } else {
          baseColor = dotColor;
        }

        // Apply duplicate coloring
        const color = getDotColor(payload, baseColor);

        return (
          <circle
            // eslint-disable-next-line
            key={`dot-default-${payload?.id}_${index}`}
            cx={cx}
            cy={cy}
            r={4}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
          />
        );
      }}
      strokeWidth={strokeWidth ? strokeWidth : 1}
    />
  );

  const renderMinScoreMeaningLabel = () => {
    if (!maxYValue) return null;
    if (!filteredData || !filteredData.length) return null;
    if (!filteredData.find((item) => item.scoreSeverity)) return null;
    const configData = filteredData.find((item) => item && item.comparisonToAlert) ?? {};
    return (
      <ReferenceLine
        y={0}
        stroke={configData.comparisonToAlert === "lower" ? ALERT_COLOR : SUCCESS_COLOR}
        strokeWidth={0}
      >
        <Label
          value={configData.comparisonToAlert === "lower" ? "Worst" : "Best"}
          fontSize="12px"
          fontWeight={500}
          fill={configData.comparisonToAlert === "lower" ? ALERT_COLOR : SUCCESS_COLOR}
          position="insideTopLeft"
        />
      </ReferenceLine>
    );
  };

  const renderMaxScoreMeaningLabel = () => {
    if (!maxYValue) return null;
    if (!filteredData || !filteredData.length) return null;
    if (!filteredData.find((item) => item.scoreSeverity)) return null;
    const configData = filteredData.find((item) => item && item.comparisonToAlert) ?? {};
    return (
      <ReferenceLine
        y={maxYValue}
        x={100}
        stroke={configData.comparisonToAlert === "lower" ? SUCCESS_COLOR : ALERT_COLOR}
        strokeWidth={0}
      >
        <Label
          value={configData.comparisonToAlert === "lower" ? "Best" : "Worst"}
          fontSize="12px"
          fontWeight={500}
          fill={configData.comparisonToAlert === "lower" ? SUCCESS_COLOR : ALERT_COLOR}
          position="insideBottomLeft"
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
          fontSize: 10,
          fontWeight: 500,
        }}
      />
    );
  };

  const MIN_CHART_WIDTH = xsChartWidth ? xsChartWidth : 400;

  return (
    <>
      {renderTitle()}
      <Box
        sx={{
          width: {
            xs: MIN_CHART_WIDTH,
            sm: chartWidth,
            md: mdChartWidth ? mdChartWidth : chartWidth,
            lg: lgChartWidth ? lgChartWidth : chartWidth,
          },
          height: chartHeight ? chartHeight : "calc(100% - 40px)",
        }}
        className="chart-wrapper"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <LineChart
            data={filteredData}
            margin={{
              top: 28,
              right: 20,
              left: 20,
              bottom: 10,
            }}
            id={`lineChart_${id ?? generateUUID()}`}
          >
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
            {enableAxisMeaningLabels && renderMaxScoreMeaningLabel()}
            {enableAxisMeaningLabels && renderMinScoreMeaningLabel()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </>
  );
}

LineCharts.propTypes = {
  chartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chartHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  data: PropTypes.array,
  dotColor: PropTypes.string,
  enableAxisMeaningLabels: PropTypes.bool,
  enableScoreSeverityArea: PropTypes.bool,
  enableScoreSeverityCutoffLine: PropTypes.bool,
  highSeverityScoreCutoff: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  legendType: PropTypes.string,
  mdChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  minimumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  showTicks: PropTypes.bool,
  strokeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  tooltipLabelFormatter: PropTypes.func,
  xDomain: PropTypes.array,
  xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xLabel: PropTypes.string,
  yLabelVisible: PropTypes.bool,
  xTickLabelAngle: PropTypes.number,
  xTickFormatter: PropTypes.func,
  xTickStyle: PropTypes.object,
  xsChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLabel: PropTypes.string,
  xLabelVisible: PropTypes.bool,
  yLineFields: PropTypes.array,
  yTickFormatter: PropTypes.func,
};
