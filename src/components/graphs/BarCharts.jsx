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

  const deduplicatedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const grouped = data.reduce((acc, item) => {
      const timestamp =
        item[xFieldKey] instanceof Date ? item[xFieldKey].valueOf() : new Date(item[xFieldKey]).valueOf();

      if (!acc[timestamp]) {
        acc[timestamp] = [];
      }
      acc[timestamp].push(item);
      return acc;
    }, {});

    // For each timestamp, decide how to combine duplicates:
    return Object.entries(grouped).map(([timestamp, items]) => {
      console.log("timestamp ", timestamp);
      if (items.length === 1) return items[0];

      // Take the latest (last) entry
      return items[items.length - 1];
    });
  }, [data, xFieldKey]);

  // Convert date strings -> timestamps once
  const parsed = useMemo(
    () =>
      deduplicatedData.map((d) => ({
        ...d,
        [xFieldKey]: d[xFieldKey] instanceof Date ? d[xFieldKey].getTime() : new Date(d[xFieldKey]).getTime(),
      })),
    [deduplicatedData, xFieldKey],
  );

  // Calculate dynamic bar size with minimum threshold
  const dynamicBarSize = useMemo(() => {
    if (parsed.length < 2) return 20;

    const timestamps = parsed.map((d) => d[xFieldKey]).sort((a, b) => a - b);

    // Find the MINIMUM gap
    let minGap = Infinity;
    for (let i = 1; i < timestamps.length; i++) {
      const gap = timestamps[i] - timestamps[i - 1];
      if (gap > 0) {
        minGap = Math.min(minGap, gap);
      }
    }

    if (minGap === Infinity) return 20;

    const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
    const estimatedChartWidth = (chartWidth || 600) - 40;

    // Calculate what percentage of the time range the minimum gap represents
    const gapRatio = minGap / timeRange;

    // Bars should take up a reasonable portion of screen space
    // If minGap is 0.002% of timeRange, we still want visible bars
    const targetBarWidth = Math.max(
      gapRatio * estimatedChartWidth * 0.5, // Proportional sizing
      20, // Minimum visible size
    );

    const calculatedBarSize = Math.min(targetBarWidth, 60);

    console.log("Dynamic bar size calculation:", {
      minGap: `${minGap}ms (${(minGap / 1000).toFixed(1)}s)`,
      timeRange: `${timeRange}ms (${(timeRange / (1000 * 60 * 60 * 24)).toFixed(1)} days)`,
      gapRatio: `${(gapRatio * 100).toFixed(4)}%`,
      estimatedChartWidth,
      calculatedBarSize,
    });

    return calculatedBarSize;
  }, [parsed, xFieldKey, chartWidth]);

  // Calculate domain padding
  const xAxisDomain = useMemo(() => {
    if (parsed.length === 0) return ["dataMin", "dataMax"];

    const timestamps = parsed.map((d) => d[xFieldKey]).sort((a, b) => a - b);
    const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
    const estimatedChartWidth = chartWidth || 600;
    const pixelsPerMs = estimatedChartWidth / timeRange;
    const barWidthInMs = dynamicBarSize / 2 / pixelsPerMs;

    return [(dataMin) => dataMin - barWidthInMs, (dataMax) => dataMax + barWidthInMs];
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
            <Bar dataKey={yFieldKey} maxBarSize={dynamicBarSize} barCategoryGap="20%" minPointSize={4}>
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
