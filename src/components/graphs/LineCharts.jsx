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
import { generateUUID, isEmptyArray, range, getLocaleDateStringFromDate } from "@/util";

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
    xDomain,
    xTickFormatter,
    xTickStyle,
    xsChartWidth,
    yFieldKey,
    yLabel,
    yLineFields,
    yTickFormatter,
  } = props;

  const theme = useTheme();

  const sources = React.useMemo(() => {
    const set = new Set();
    for (const d of data || []) if (d?.source) set.add(d.source);
    return Array.from(set);
  }, [data]);

  const hasMultipleYFields = () => yLineFields && yLineFields.length > 0;

  let maxYValue = maximumYValue
    ? maximumYValue
    : data?.reduce((m, d) => Math.max(m, Number(d[yFieldKey] ?? -Infinity)), -Infinity);
  let minYValue = minimumYValue ?? data?.reduce((min, d) => Math.min(min, d[yFieldKey]), Infinity);
  maxYValue = !data || maxYValue === -Infinity ? null : maxYValue;

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
    Array.isArray(xDomain) && typeof xDomain[0] === "number"
      ? buildTimeTicks(xDomain, { unit: "month", step: 6 }) // or step: 3 for quarters
      : undefined;

  // 1) Ensure numeric & unique; 2) Clamp to domain; 3) Sort; 4) Thin to fit; 5) Dedupe again (belt & suspenders)
  const clampedAll = allTicksRaw ? allTicksRaw.filter((t) => t >= xDomain[0] && t <= xDomain[1]) : undefined;

  const allTicks = clampedAll ? uniqSorted(clampedAll) : undefined;

  const ticksRaw = allTicks ? thinTicksToFit(allTicks, (ms) => fmtMonthYear.format(ms), chartWidth) : undefined;

  // Final ticks to render (unique & sorted)
  const ticks = ticksRaw ? uniqSorted(ticksRaw) : undefined;

  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      height={108}
      domain={xDomain ? xDomain : ["dataMin", "dataMax"]}
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
      ticks={ticks}
    >
      {xLabel && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );

  const yDomain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];
  const yTicks = maxYValue ? range(minYValue ?? 0, maxYValue) : range(minYValue ?? 0, 50);

  // ----- KEY-SAFE CUSTOM DOT -----
  const SourceDot = ({ cx, cy, payload, index, params }) => {
    if (isEmptyArray(sources)) return null;
    if (cx == null || cy == null) return null;
    const useParams = params ? params : {};
    let color;
    if (payload.highSeverityScoreCutoff && payload[yFieldKey] >= payload.highSeverityScoreCutoff) color = ALERT_COLOR;
    else if (payload.mediumSeverityScoreCutoff && payload[yFieldKey] >= payload.mediumSeverityScoreCutoff)
      color = WARNING_COLOR;
    else color = SUCCESS_COLOR;

    // Prefer payload.id; otherwise compose a stable-ish key using source + x + index
    const k = `dot-${payload?.id}_${payload?.key}_${payload?.source}-${payload?.[xFieldKey]}-${index}`;
    switch (payload.source) {
      case "cnics":
        return <circle key={k} cx={cx} cy={cy} r={useParams.r ?? 4} fill={color} stroke={color} strokeWidth={1} />;
      case "epic":
        return (
          <rect
            key={k}
            x={cx - 2}
            y={cy - 2}
            width={useParams.width ?? 6}
            height={useParams.height ?? 6}
            fill={color}
            stroke={color}
            strokeWidth={1.5}
          />
        );
      default:
        return <circle key={k} cx={cx} cy={cy} r={useParams.r ?? 4} fill={color} />;
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
      label={yLabel ? { value: yLabel, angle: -90, position: "insideLeft" } : null}
      minTickGap={8}
      tickLine={{ stroke: "#FFF" }}
      stroke="#FFF"
      tick={
        showTicks
          ? (e) => {
              const configData = data.find((item) => item.highSeverityScoreCutoff);
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

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;

    // The original data object for this x-position
    const d = payload[0].payload ?? {};
    const rawDate = d[xFieldKey] ?? d.date;
    const meaning = d.meaning ?? d.scoreMeaning ?? d.label;
    const score = d[yFieldKey] ?? d.score;

    // use provided formatter; else a default
    const fmtDate =
      (typeof tooltipLabelFormatter === "function" && tooltipLabelFormatter(rawDate)) ||
      (rawDate ? getLocaleDateStringFromDate(rawDate) : "—");

    // if multiple lines, payload will have one entry per series
    const multiValues = payload.map((p, i) => ({
      key: p.dataKey ?? p.name ?? `series-${i}`,
      value: p.value,
      color: p.color,
      name: p.name ?? p.dataKey,
    }));

    const FONT_COLOR = "#666";

    return (
      <div className="tooltip-container">
        <div className="tooltip-label">{fmtDate}</div>

        {/* Single-series summary line (falls back to multi if present) */}
        {meaning != null || score != null ? (
          <div style={{ marginBottom: multiValues.length > 1 ? 8 : 0 }}>
            {score != null && (
              <div>
                <span style={{ color: FONT_COLOR }}>score:</span> {String(score)}
              </div>
            )}
            {meaning && (
              <div>
                <span style={{ color: FONT_COLOR }}>meaning:</span> {String(meaning)}
              </div>
            )}
          </div>
        ) : null}

        {/* Multi-series values (if render multiple yLineFields) */}
        {multiValues.length > 1 &&
          multiValues.map((m) => (
            <div key={`tt-${m.key}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  display: "inline-block",
                  background: m.color,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
              <span style={{ color: FONT_COLOR }}>{m.name}:</span> {m.value}
            </div>
          ))}
      </div>
    );
  };
  CustomTooltip.propTypes = {
    // whether tooltip is visible
    active: PropTypes.bool,
    // Recharts passes an array of series entries for this x-position
    payload: PropTypes.arrayOf(
      PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
        dataKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        color: PropTypes.string,
        payload: PropTypes.object, // raw data point: { date, score, meaning, ... }
      }),
    ),
    // the x-value for this tooltip (e.g. date)
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  const renderToolTip = () => (
    <Tooltip
      itemStyle={{ fontSize: "10px" }}
      labelStyle={{ fontSize: "10px" }}
      animationBegin={500}
      animationDuration={550}
      labelFormatter={tooltipLabelFormatter}
      content={CustomTooltip}
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
            <circle cx="8" cy="8" r="4" fill="#444" />
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
            <rect x="4" y="4" width="8" height="8" fill="#444" />
          </svg>
        ),
      });
    }

    return (
      <div style={{ display: "flex", gap: 16, alignItems: "center", padding: "4px 8px" }}>
        {items.map((it) => (
          <div
            key={it.key} // simple, stable
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

        // source-based shapes (hover version – slightly bigger from SourceDot's isActive)
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

        // fallback: severity-based active circles
        let color = dotColor;
        // eslint-disable-next-line
        if (payload.highSeverityScoreCutoff) {
          // eslint-disable-next-line
          color = value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
        }

        return <circle cx={cx} cy={cy} r={5} fill={color} stroke="none" />;
      }}
      dot={({ cx, cy, payload, value, index }) => {
        if (!isEmptyArray(sources))
          // eslint-disable-next-line
          return <SourceDot key={`${payload?.id}_${index}`} cx={cx} cy={cy} payload={payload} index={index} />;
        let color;
        // eslint-disable-next-line
        if (payload.highSeverityScoreCutoff) {
          // eslint-disable-next-line
          color = value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
          return (
            //eslint-disable-next-line
            <circle key={`dot-default-${payload?.id}_${index}`} cx={cx} cy={cy} r={4} fill={color} stroke="none" />
          );
        }
        return (
          // eslint-disable-next-line
          <circle key={`dot-default-${payload?.id}_${index}`} cx={cx} cy={cy} r={4} fill={dotColor} stroke="none" />
        );
      }}
      strokeWidth={strokeWidth ? strokeWidth : 1}
    />
  );

  const renderMinScoreMeaningLabel = () => {
    if (!maxYValue) return null;
    if (!data || !data.length) return null;
    if (!data.find((item) => item.scoreSeverity)) return null;
    const configData = data.find((item) => item && item.comparisonToAlert) ?? {};
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
    if (!data || !data.length) return null;
    if (!data.find((item) => item.scoreSeverity)) return null;
    const configData = data.find((item) => item && item.comparisonToAlert) ?? {};
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
    if (!data || !data.length) return null;
    const configData = data.find((item) => item && item.highSeverityScoreCutoff);
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
    if (!data || !data.length) return null;
    const configData = data.find((item) => item && item.highSeverityScoreCutoff);
    if (!configData) return null;
    if (configData.comparisonToAlert === "lower") {
      return <ReferenceArea y2={configData.highSeverityScoreCutoff} fill="#FCE3DA" fillOpacity={0.3} />;
    }
    return <ReferenceArea y1={configData.highSeverityScoreCutoff} fill="#FCE3DA" fillOpacity={0.3} />;
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
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 20,
              left: 0,
              bottom: 20,
            }}
            id={`lineChart_${id ?? generateUUID()}`}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderXAxis()}
            {renderYAxis()}
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
  xTickLabelAngle: PropTypes.number,
  xTickFormatter: PropTypes.func,
  xTickStyle: PropTypes.object,
  xsChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLabel: PropTypes.string,
  yLineFields: PropTypes.array,
  yTickFormatter: PropTypes.func,
};
