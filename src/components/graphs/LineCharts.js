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
} from "recharts";
export default function LineCharts(props) {
  const {
    id,
    title,
    chartWidth,
    chartHeight,
    legendType,
    strokeWidth,
    xDomain,
    xTickFormatter,
    xFieldKey,
    xLabel,
    yDomain,
    yFieldKey,
    yLineFields,
    yLabel,
    yTicks,
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
  return (
    <>
      <Typography
        variant="subtitle1"
        component="h3"
        color="secondary"
        sx={{ textAlign: "center", marginTop: 2 }}
      >
        {title}
      </Typography>
      <Box width={chartWidth} height={chartHeight}>
        <LineChart
          width={chartWidth}
          height={chartHeight}
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
          <YAxis
            domain={yDomain || [0, "auto"]}
            label={{ value: yLabel, angle: -90, position: "insideLeft" }}
            interval="preserveStartEnd"
            tick={{ style: { fontSize: "12px" } }}
            ticks={yTicks}
            tickMargin={8}
          />
          <Tooltip
            itemStyle={{ fontSize: "12px" }}
            labelStyle={{ fontSize: "12px" }}
            animationBegin={500}
            animationDuration={500}
          />
          <Legend
            formatter={(value) => (
              <span style={{ marginRight: "8px", fontSize: "14px" }}>
                {value.replace(/_/g, " ")}
              </span>
            )}
            iconSize={12}
          />
          {hasYFields() &&
            yLineFields.map((item, index) => (
              <Line
                {...defaultOptions}
                key={`line_${id}_${index}`}
                type="monotone"
                dataKey={item.key}
                stroke={item.color}
                strokeWidth={item.strokeWidth ? item.strokeWidth : 2}
                strokeDasharray={
                  item.strokeDasharray ? item.strokeDasharray : 0
                }
                legendType={item.legendType ? item.legendType : "line"}
                dot={
                  item.dot ? item.dot : { strokeDasharray: "", strokeWidth: 2 }
                }
              />
            ))}
          {!hasYFields() && (
            <Line
              {...defaultOptions}
              type="monotone"
              dataKey={yFieldKey}
              stroke={theme.palette.primary.main}
              strokeWidth={strokeWidth ? strokeWidth : 2}
            />
          )}
        </LineChart>
      </Box>
    </>
  );
}
