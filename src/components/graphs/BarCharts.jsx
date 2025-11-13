import PropTypes from "prop-types";
import { Typography, Box } from "@mui/material";
import { BarChart, Bar, CartesianGrid, Cell, Label, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

export default function BarCharts(props) {
  const {
    id,
    title,
    xsChartWidth,
    chartWidth,
    lgChartWidth,
    xTickFormatter,
    xFieldKey, // "date"
    xLabel,
    maximumYValue,
    minimumYValue,
    yFieldKey, // "total", "score", etc.
    tooltipLabelFormatter,
    data = [],
  } = props;

  // Convert date strings -> timestamps once
  const parsed = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        [xFieldKey]: d[xFieldKey] instanceof Date ? d[xFieldKey].getTime() : new Date(d[xFieldKey]).getTime(), // yields ms since epoch
      })),
    [data, xFieldKey],
  );

  const MIN_CHART_WIDTH = xsChartWidth ?? 400;

  let maxYValue = maximumYValue ?? parsed.reduce((m, d) => Math.max(m, Number(d?.[yFieldKey] ?? -Infinity)), -Infinity);
  let minYValue = minimumYValue ?? data?.reduce((min, d) => Math.min(min, d[yFieldKey]), Infinity);
  maxYValue = parsed.length === 0 || maxYValue === -Infinity ? null : maxYValue;
  const yDomain = maxYValue ? [minYValue, maxYValue] : [minYValue, "auto"];

  const renderTitle = () => (
    <Typography variant="subtitle1" component="h4" color="secondary" sx={{ textAlign: "center", mt: 1 }}>
      {title}
    </Typography>
  );

  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      type="number"
      scale="time" // time scale
      domain={["dataMin", "dataMax"]}
      height={108}
      tick={{ fontSize: 12, fontWeight: 500, textAnchor: "middle" }} // no nested "style" object
      tickFormatter={(ts) => (xTickFormatter ? xTickFormatter(ts) : new Date(ts).toLocaleDateString())}
      tickMargin={12}
      interval="preserveStartEnd"
    >
      {xLabel && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );

  const renderYAxis = () => <YAxis domain={yDomain} minTickGap={4} stroke="#FFF" tick={false} />;

  const renderToolTip = () => (
    <Tooltip
      itemStyle={{ fontSize: 10 }}
      labelStyle={{ fontSize: 10 }}
      animationBegin={500}
      animationDuration={550}
      labelFormatter={tooltipLabelFormatter}
    />
  );

  return (
    <>
      {renderTitle()}
      <Box
        sx={{
          width: { xs: MIN_CHART_WIDTH, sm: chartWidth, lg: lgChartWidth ?? chartWidth },
          height: 250,
        }}
        key={id}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <BarChart
            margin={{
              top: 20,
              right: 40,
              left: 0,
              bottom: 20,
            }}
            data={parsed}
            style={{ width: "100%", maxWidth: "700px", aspectRatio: 1.618 }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderXAxis()}
            {renderYAxis()}
            {renderToolTip()}
            <Bar dataKey={yFieldKey} barSize={20}>
              {parsed.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  stroke={entry[yFieldKey] >= entry.highSeverityScoreCutoff ? "red" : "green"}
                  fill={entry[yFieldKey] >= entry.highSeverityScoreCutoff ? "red" : "green"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </>
  );
}
BarCharts.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  xsChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  highScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  legendType: PropTypes.string,
  strokeWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xDomain: PropTypes.array,
  xTickFormatter: PropTypes.func,
  xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xLabel: PropTypes.string,
  minimumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLineFields: PropTypes.array,
  yLabel: PropTypes.string,
  yTickFormatter: PropTypes.func,
  tooltipLabelFormatter: PropTypes.func,
  data: PropTypes.array,
};
