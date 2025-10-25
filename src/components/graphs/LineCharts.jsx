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
import { generateUUID, isEmptyArray, range } from "@/util";
export default function LineCharts(props) {
  const {
    chartHeight,
    chartWidth,
    data,
    dotColor,
    highScore,
    id,
    legendType,
    lgChartWidth,
    maximumYValue,
    minimumYValue,
    showTicks,
    strokeWidth,
    title,
    tooltipLabelFormatter,
    xFieldKey,
    xLabel,
    // xDomain,
    xTickFormatter,
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
    activeDot: { r: 6 },
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
  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      height={108}
      domain={["dataMin", "dataMax"]}
      textAnchor="end"
      type="number"
      allowDataOverflow={false}
      tick={{ style: { fontSize: "12px", fontWeight: 500, textAnchor: "middle" } }}
      tickFormatter={xTickFormatter}
      tickMargin={12}
      interval="preserveStartEnd"
      scale="time"
      connectNulls={false}
    >
      {xLabel && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );
  const yDomain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];
  const yTicks = maxYValue ? range(minYValue ?? 0, maxYValue) : range(minYValue ?? 0, 50);
  const SourceDot = ({ cx, cy, payload }, highScore) => {
    if (isEmptyArray(sources)) return null;
    if (!cx || !cy) return null;
    let color;
    if (highScore && payload[yFieldKey] >= highScore) color = "red";
    else color = "green";

    switch (payload.source) {
      case "cnics":
        return <circle cx={cx} cy={cy} r={4} fill={color} stroke={color} strokeWidth={1} />;
      case "epic":
        return <rect x={cx - 2} y={cy - 2} width={6} height={6} fill={color} stroke={color} strokeWidth={1.5} />;
      // add other sources if needed
      default:
      return <circle cx={cx} cy={cy} r={4} fill={color} />;
    }
  };
  SourceDot.propTypes = {
    cx: PropTypes.number,
    cy: PropTypes.number,
    payload: PropTypes.object,
  };

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
                  if (value <= parseInt(configData.highSeverityScoreCutoff)) {
                    color = "red";
                  }
                } else {
                  if (value >= parseInt(configData.highSeverityScoreCutoff)) {
                    color = "red";
                  }
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
      labelFormatter={tooltipLabelFormatter}
    />
  );
  const renderLegend = () => {
    if (isEmptyArray(sources))
      return (
        <Legend
          formatter={(value) => (
            <span style={{ marginRight: "8px", fontSize: "14px" }}>{value.replace(/_/g, " ")}</span>
          )}
          iconSize={12}
          wrapperStyle={{
            bottom: "12px",
          }}
        />
      );
    return (
      <Legend
        verticalAlign="top"
        align="right"
        wrapperStyle={{ position: "absolute", top: 10, right: 36, width: "auto" }}
        content={(legendProps) => <SourceLegend {...legendProps} sources={sources}></SourceLegend>}
      />
    );
  };
  const SourceLegend = () => {
    // Draw icons that mirror your dot shapes
    const items = [
      {
        key: "cnics",
        label: "CNICS",
        icon: (
          <svg width="16" height="16">
            <circle cx="8" cy="8" r="4" fill="green" />
          </svg>
        ),
      },
      {
        key: "epic",
        label: "Epic",
        icon: (
          <svg width="16" height="16">
            <rect x="4" y="4" width="8" height="8" fill="green" />
          </svg>
        ),
      },
    ];
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
      dot={({ cx, cy, payload, value }) => {
        if (!isEmptyArray(sources)) return SourceDot({ cx, cy, payload }, highScore);
        let color;
        if (highScore) {
          if (highScore && value >= highScore) color = "red";
          else color = "green";
          return <circle cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
        }
        return <circle cx={cx} cy={cy} r={4} fill={dotColor} stroke="none" />;
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
      <ReferenceLine y={0} stroke={configData.comparisonToAlert === "lower" ? "red" : "green"} strokeWidth={0}>
        <Label
          value={configData.comparisonToAlert === "lower" ? "Worst" : "Best"}
          fontSize="12px"
          fontWeight={500}
          fill={configData.comparisonToAlert === "lower" ? "red" : "green"}
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
        stroke={configData.comparisonToAlert === "lower" ? "green" : "red"}
        strokeWidth={0}
      >
        <Label
          value={configData.comparisonToAlert === "lower" ? "Best" : "Worst"}
          fontSize="12px"
          fontWeight={500}
          fill={configData.comparisonToAlert === "lower" ? "green" : "red"}
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
        stroke="red"
        strokeWidth={1}
        strokeDasharray="3 3"
      ></ReferenceLine>
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
              right: 40,
              left: 0,
              bottom: 20,
            }}
            id={`lineChart_${id ?? generateUUID()}`}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderXAxis()}
            {renderYAxis()}
            {renderScoreSeverityCutoffLine()}
            {renderScoreSeverityArea()}
            {renderToolTip()}
            {renderLegend()}
            {hasMultipleYFields() && renderMultipleLines()}
            {!hasMultipleYFields() && renderSingleLine()}
            {renderMaxScoreMeaningLabel()}
            {renderMinScoreMeaningLabel()}
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
  highScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  legendType: PropTypes.string,
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
  xTickFormatter: PropTypes.func,
  xsChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLabel: PropTypes.string,
  yLineFields: PropTypes.array,
  yTickFormatter: PropTypes.func,
};
