import PropTypes from "prop-types";
import { Typography, Box } from "@mui/material";
import { BarChart, Bar, CartesianGrid, Cell, Label, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { SUCCESS_COLOR, ALERT_COLOR } from "@config/chart_config";
import CustomTooltip from "./CustomTooltip";

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
    yLabel,
    xLabelVisible,
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

  // Calculate dynamic bar size based on time range
  const dynamicBarSize = useMemo(() => {
    if (parsed.length < 2) return 12; // Default for single point

    const timestamps = parsed.map((d) => d[xFieldKey]).sort((a, b) => a - b);
    const minTimestamp = timestamps[0];
    const maxTimestamp = timestamps[timestamps.length - 1];
    const timeRange = maxTimestamp - minTimestamp;

    // Calculate average time gap between consecutive points
    let totalGaps = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalGaps += timestamps[i] - timestamps[i - 1];
    }
    const avgGap = totalGaps / (timestamps.length - 1);

    // Estimate chart width (use a reasonable default if dynamic sizing)
    const estimatedChartWidth = chartWidth || 600;

    // Calculate pixels per millisecond
    const pixelsPerMs = estimatedChartWidth / timeRange;

    // Bar size should be a percentage of the average gap
    // Use 20-30% of average gap, with min/max bounds
    const calculatedBarSize = Math.min(Math.max(avgGap * pixelsPerMs * 0.25, 12), 36);

    return calculatedBarSize;
  }, [parsed, xFieldKey, chartWidth]);

  // Calculate domain padding
  const xAxisDomain = useMemo(() => {
    if (parsed.length === 0) return ["dataMin", "dataMax"];
    
    const timestamps = parsed.map(d => d[xFieldKey]).sort((a, b) => a - b);
    const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
    const estimatedChartWidth = chartWidth || 600;
    const pixelsPerMs = estimatedChartWidth / timeRange;
    const barWidthInMs = (dynamicBarSize / 2) / pixelsPerMs;
    
    return [
      (dataMin) => dataMin - barWidthInMs,
      (dataMax) => dataMax + barWidthInMs
    ];
  }, [parsed, xFieldKey, chartWidth, dynamicBarSize]);


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
      domain={xAxisDomain}
      height={108}
      tick={{ fontSize: 12, fontWeight: 500, textAnchor: "middle" }} // no nested "style" object
      tickFormatter={(ts) => (xTickFormatter ? xTickFormatter(ts) : new Date(ts).toLocaleDateString())}
      tickMargin={12}
      interval="preserveStartEnd"
    >
      {xLabel && xLabelVisible && <Label value={xLabel} offset={-8} position="insideBottom" />}
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
      content={(props) => <CustomTooltip {...props} yFieldKey={yFieldKey} xFieldKey={xFieldKey} yLabel={yLabel} />}
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
              top: 10,
              right: 20,
              left: 20,
              bottom: 10,
            }}
            data={parsed}
            style={{ width: "100%", maxWidth: "650px" }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderXAxis()}
            {renderYAxis()}
            {renderToolTip()}
            <Bar dataKey={yFieldKey} barSize={dynamicBarSize} minPointSize={4}>
              {parsed.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  stroke={entry[yFieldKey] >= entry.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR}
                  fill={entry[yFieldKey] >= entry.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR}
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
  lgChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xTickFormatter: PropTypes.func,
  xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xLabel: PropTypes.string,
  xLabelVisible: PropTypes.bool,
  minimumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  maximumYValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLabel: PropTypes.string,
  tooltipLabelFormatter: PropTypes.func,
  data: PropTypes.array,
};
