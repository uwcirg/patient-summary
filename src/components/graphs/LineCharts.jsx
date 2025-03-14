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
import { range } from "../../util/util";
export default function LineCharts(props) {
  const {
    id,
    title,
    xsChartWidth,
    chartWidth,
    lgChartWidth,
    legendType,
    strokeWidth,
    xDomain,
    xTickFormatter,
    xFieldKey,
    xLabel,
    maximumScore,
    yFieldKey,
    yLineFields,
    yLabel,
    yTickFormatter,
    tooltipLabelFormatter,
    data,
  } = props;
  const theme = useTheme();
  const hasYFields = () => yLineFields && yLineFields.length > 0;
  const defaultOptions = {
    activeDot: { r: 6 },
    dot: { strokeWidth: 2 },
    isAnimationActive: false,
    animationBegin: 350,
    legendType: legendType || "line",
  };
  const renderTitle = () => (
    <Typography
      variant="subtitle1"
      component="h4"
      color="secondary"
      sx={{ textAlign: "center", marginTop: 2 }}
    >
      {title}
    </Typography>
  );
  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      height={64}
      domain={xDomain}
      tick={{ style: { fontSize: "12px" } }}
      tickFormatter={xTickFormatter}
      tickMargin={12}
    >
      <Label value={xLabel} offset={8} position="insideBottom" />
    </XAxis>
  );
  const yDomain = maximumScore ? [0, maximumScore] : [0, "auto"];
  const yTicks = maximumScore ? range(0, maximumScore) : range(0, 50);

  const renderYAxis = () => (
    <YAxis
      domain={yDomain}
      label={{ value: yLabel, angle: -90, position: "insideLeft" }}
      interval={maximumScore > 40 ? "preserveEnd" : 0}
      minTickGap={8}
      tick={(e) => {
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
        return <Text {...e}>{value}</Text>;
      }}
      tickFormatter={yTickFormatter}
      ticks={yTicks}
      tickMargin={8}
    />
  );
  const renderToolTip = () => (
    <Tooltip
      itemStyle={{ fontSize: "12px" }}
      labelStyle={{ fontSize: "12px" }}
      animationBegin={500}
      animationDuration={550}
      labelFormatter={tooltipLabelFormatter}
    />
  );
  const renderLegend = () => (
    <Legend
      formatter={(value) => (
        <span style={{ marginRight: "8px", fontSize: "14px" }}>
          {value.replace(/_/g, " ")}
        </span>
      )}
      iconSize={12}
    />
  );
  const renderMultipleLines = () =>
    yLineFields.map((item, index) => (
      <Line
        {...defaultOptions}
        key={`line_${id}_${index}`}
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
      strokeWidth={strokeWidth ? strokeWidth : 2}
    />
  );
  const renderMinScoreMeaningLabel = () => {
    if (!maximumScore) return null;
    if (!data || !data.length) return null;
    if (!data.find((item) => item.scoreSeverity)) return null;
    const configData =
      data.find((item) => item && item.comparisonToAlert) ?? {};
    return (
      <ReferenceLine
        y={0}
        stroke={configData.comparisonToAlert === "lower" ? "red" : "green"}
        strokeWidth={0}
      >
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
    if (!maximumScore) return null;
    if (!data || !data.length) return null;
    if (!data.find((item) => item.scoreSeverity)) return null;
    const configData =
      data.find((item) => item && item.comparisonToAlert) ?? {};
    return (
      <ReferenceLine
        y={maximumScore}
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
    if (!maximumScore) return null;
    if (!data || !data.length) return null;
    const configData = data.find(
      (item) => item && item.highSeverityScoreCutoff
    );
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
    if (!maximumScore) return null;
    if (!data || !data.length) return null;
    const configData = data.find(
      (item) => item && item.highSeverityScoreCutoff
    );
    if (!configData) return null;
    if (configData.comparisonToAlert === "lower") {
      return (
        <ReferenceArea
          y2={configData.highSeverityScoreCutoff}
          fill="#FCE3DA"
          fillOpacity={0.3}
        />
      );
    }
    return (
      <ReferenceArea
        y1={configData.highSeverityScoreCutoff}
        fill="#FCE3DA"
        fillOpacity={0.3}
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
            lg: lgChartWidth ? lgChartWidth : chartWidth,
          },
          height: "calc(100% - 40px)",
        }}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <LineChart
            data={data}
            margin={{
              top: 30,
              right: 60,
              left: 20,
              bottom: 20,
            }}
            id={`lineChart_${id}`}
          >
            <CartesianGrid strokeDasharray="2 2" />
            {renderXAxis()}
            {renderYAxis()}
            {renderToolTip()}
            {renderLegend()}
            {renderScoreSeverityCutoffLine()}
            {renderScoreSeverityArea()}
            {hasYFields() && renderMultipleLines()}
            {!hasYFields() && renderSingleLine()}
            {renderMaxScoreMeaningLabel()}
            {renderMinScoreMeaningLabel()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </>
  );
}

LineCharts.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  xsChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  legendType: PropTypes.string,
  strokeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xDomain: PropTypes.array,
  xTickFormatter: PropTypes.func,
  xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xLabel: PropTypes.string,
  maximumScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLineFields: PropTypes.array,
  yLabel: PropTypes.string,
  yTickFormatter: PropTypes.func,
  tooltipLabelFormatter: PropTypes.func,
  data: PropTypes.array,
};
