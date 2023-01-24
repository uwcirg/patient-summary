import { Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Label,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {range} from "../../util/util";
export default function LineCharts(props) {
  const {
    id,
    title,
    xsChartWidth,
    chartWidth,
    lgChartWidth,
    chartHeight,
    legendType,
    strokeWidth,
    xDomain,
    xTickFormatter,
    xFieldKey,
    xLabel,
   // yDomain,
    maximumScore,
    yFieldKey,
    yLineFields,
    yLabel,
   // yTicks,
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
      component="h3"
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
      tickMargin={8}
    >
      <Label value={xLabel} offset={12} position="insideBottom" />
    </XAxis>
  );
  const yDomain = maximumScore ? [0, maximumScore]: [0, "auto"];
  const yTicks = maximumScore ? range(0, maximumScore) : range(0, 50);
  
  const renderYAxis = () => (
    <YAxis
      domain={yDomain}
      label={{ value: yLabel, angle: -90, position: "insideLeft" }}
      interval="preserveStartEnd"
      tick={{ style: { fontSize: "12px" } }}
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
  const MIN_CHART_WIDTH = xsChartWidth? xsChartWidth : 400;
  return (
    <>
      {renderTitle()}
      <Box
        sx={{
          width: {
            xs: MIN_CHART_WIDTH,
            sm: chartWidth,
            lg: lgChartWidth ? lgChartWidth: chartWidth
          },
          height: chartHeight,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
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
            {hasYFields() && renderMultipleLines()}
            {!hasYFields() && renderSingleLine()}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </>
  );
}
