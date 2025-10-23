import PropTypes from "prop-types";
import { Typography, Box } from "@mui/material";
import { BarChart, Bar, Cell, Label, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

export default function BarCharts(props) {
  const {
    id,
    title,
    xsChartWidth,
    chartWidth,
    lgChartWidth,
    xDomain,
    xTickFormatter,
    xFieldKey,
    xLabel,
    maximumScore,
    highScore,
    minimumScore,
    yFieldKey,
    tooltipLabelFormatter,
    data,
  } = props;
  const MIN_CHART_WIDTH = xsChartWidth ? xsChartWidth : 400;
  let maxYValue = maximumScore
    ? maximumScore
    : data?.reduce((m, d) => Math.max(m, Number(d?.score ?? -Infinity)), -Infinity);
  let minYValue = minimumScore ?? 0;
  maxYValue = !data || maxYValue === -Infinity ? null : maxYValue;

  const renderTitle = () => (
    <Typography variant="subtitle1" component="h4" color="secondary" sx={{ textAlign: "center", marginTop: 1 }}>
      {title}
    </Typography>
  );
  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      height={108}
      domain={xDomain}
      textAnchor="end"
      tick={{ style: { fontSize: "12px", fontWeight: 500 } }}
      tickFormatter={xTickFormatter}
      tickMargin={12}
      interval="preserveStartEnd"
    >
      {xLabel && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );
  const yDomain = maxYValue ? [minYValue ?? 0, maxYValue] : [minYValue ?? 0, "auto"];

  const renderYAxis = () => (
    <YAxis
      domain={yDomain}
      minTickGap={4}
      stroke="#FFF"
      tick={false}
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
          //     height: "calc(100% - 40px)",
          height: 250,
        }}
        key={id}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <BarChart style={{ width: "100%", maxWidth: "700px", aspectRatio: 1.618 }} responsive data={data}>
            {renderXAxis()}
            {renderYAxis()}
            {renderToolTip()}
            <Bar dataKey={yFieldKey} barSize={20}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  stroke={entry[yFieldKey] >= highScore ? "red" : "green"}
                  fill={entry[yFieldKey] >= highScore ? "red" : "green"}
                />
              ))}
            </Bar>
          </BarChart>
          ;
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
  minimumScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumScore: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLineFields: PropTypes.array,
  yLabel: PropTypes.string,
  yTickFormatter: PropTypes.func,
  tooltipLabelFormatter: PropTypes.func,
  data: PropTypes.array,
};
