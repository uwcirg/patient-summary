import PropTypes from "prop-types";
import { Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Label,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import React, { useMemo } from "react";
import { SUCCESS_COLOR, ALERT_COLOR, buildTimeTicks, fmtMonthYear, thinTicksToFit } from "@config/chart_config";
import CustomTooltip from "./CustomTooltip";

export default function BarCharts(props) {
  const {
    id,
    title,
    chartWidth,
    mdChartWidth,
    lgChartWidth,
    xDomain,
    xTickFormatter,
    xFieldKey, // "date"
    xLabel,
    yLabel,
    xLabelVisible,
    maximumYValue,
    minimumYValue,
    yFieldKey, // "total", "score", etc.
    tooltipLabelFormatter,
    tooltipValueFormatter,
    data = [],
  } = props;

  const CUT_OFF_YEAR = 5;

  const getBarColor = (entry, baseColor) => {
    // If no duplicates on this day, use base color
    if (!entry._duplicateCount || entry._duplicateCount === 1) {
      return baseColor;
    }

    // For duplicates, adjust the brightness based on index
    // Convert hex to RGB, adjust brightness, convert back
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

    // Adjust brightness: first bar darker, last bar lighter
    const brightnessStep = 5; // Adjust this value for more/less variation
    const adjustment = (entry._duplicateIndex - Math.floor(entry._duplicateCount / 2)) * brightnessStep;

    return adjustBrightness(baseColor, adjustment);
  };

  // Process data to separate bars on the same calendar day AND same y-value
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Calculate the time range of the data
    const timestamps = data.map((item) =>
      item[xFieldKey] instanceof Date ? item[xFieldKey].getTime() : new Date(item[xFieldKey]).getTime(),
    );
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const timeRangeMs = maxTimestamp - minTimestamp;

    // Dynamic spread width: use 0.5% of total time range, with min/max bounds
    const minSpread = 2 * 60 * 60 * 1000; // Minimum: 2 hours
    const maxSpread = 6 * 24 * 60 * 60 * 1000; // Maximum: 6 days
    const dynamicSpreadWidth = Math.max(minSpread, Math.min(maxSpread, timeRangeMs * 0.005));

    // console.log("BarChart - Dynamic spread calculation:", {
    //   timeRangeDays: (timeRangeMs / (24 * 60 * 60 * 1000)).toFixed(1),
    //   spreadWidthHours: (dynamicSpreadWidth / (60 * 60 * 1000)).toFixed(1),
    // });

    // Group by calendar day only (ignoring time and y-value)
    const groups = {};
    data.forEach((item) => {
      const timestamp =
        item[xFieldKey] instanceof Date ? item[xFieldKey].getTime() : new Date(item[xFieldKey]).getTime();

      // Round to start of day (midnight)
      const dateOnly = new Date(timestamp);
      dateOnly.setHours(0, 0, 0, 0);
      const dayKey = dateOnly.getTime();

      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push({ ...item, originalTimestamp: timestamp });
    });

    // Add horizontal offset for bars on the same day
    const result = [];
    Object.values(groups).forEach((group) => {
      if (group.length === 1) {
        // Single bar on this day - no offset needed
        result.push({
          ...group[0],
          [xFieldKey]: group[0].originalTimestamp,
        });
      } else {
        // Multiple bars on this day - spread them out using dynamic width
        group.forEach((item, index) => {
          const offset = (index - (group.length - 1) / 2) * (dynamicSpreadWidth / group.length);

          result.push({
            ...item,
            [xFieldKey]: item.originalTimestamp + offset,
            _duplicateIndex: index,
            _duplicateCount: group.length,
          });
        });
      }
    });

    return result;
  }, [data, xFieldKey]);

  const { filteredData, wasTruncated, truncationDate } = useMemo(() => {
    // Use 'data' (original prop) instead of 'processedData' to check for truncation
    if (!data || data.length === 0) {
      return { filteredData: [], wasTruncated: false, truncationDate: null };
    }

    // Calculate cutoff years ago from today
    const cutoffYearsAgo = new Date();
    cutoffYearsAgo.setFullYear(cutoffYearsAgo.getFullYear() - CUT_OFF_YEAR);
    const cutoffTimestamp = cutoffYearsAgo.getTime();

    // Check if any ORIGINAL data was truncated (before processing)
    const hasOlderData = data.some((item) => {
      const timestamp =
        item[xFieldKey] instanceof Date ? item[xFieldKey].getTime() : new Date(item[xFieldKey]).getTime();
      return timestamp < cutoffTimestamp;
    });

    // Filter the PROCESSED data to last years
    const filtered = processedData.filter((item) => {
      const timestamp = item.originalTimestamp || item[xFieldKey];
      return timestamp >= cutoffTimestamp;
    });

    return {
      filteredData: filtered,
      wasTruncated: hasOlderData,
      truncationDate: hasOlderData ? cutoffTimestamp : null,
    };
  }, [data, processedData, xFieldKey]);

  // Convert date strings -> timestamps once
  const parsed = useMemo(
    () =>
      filteredData.map((d) => ({
        ...d,
        [xFieldKey]: d[xFieldKey] instanceof Date ? d[xFieldKey].getTime() : new Date(d[xFieldKey]).getTime(),
      })),
    [filteredData, xFieldKey],
  );

  // Fixed bar size for consistent visibility across time ranges
  const dynamicBarSize = useMemo(() => {
    // Use a fixed, reasonable bar size that will always be visible
    return 30;
  }, []);

  // Calculate domain with fixed range from cutoff to now (matches LineChart)
  const xAxisDomain = useMemo(() => {
    // If custom xDomain is provided, use it
    if (xDomain) {
      // console.log("BarChart using custom xDomain:", {
      //   title: title,
      //   start: new Date(xDomain[0]).toLocaleDateString(),
      //   end: new Date(xDomain[1]).toLocaleDateString(),
      //   rawDomain: xDomain,
      // });
      return xDomain;
    }

    if (parsed.length === 0) return ["dataMin", "dataMax"];

    const now = new Date().getTime();
    const cutoffYearsAgo = new Date();
    cutoffYearsAgo.setFullYear(cutoffYearsAgo.getFullYear() - CUT_OFF_YEAR);
    const cutoffTimestamp = cutoffYearsAgo.getTime();

    // Add padding (e.g., 1 month = ~30 days)
    const paddingMs = 30 * 24 * 60 * 60 * 1000;

    const domain = [cutoffTimestamp - paddingMs, now + paddingMs];

    // console.log("BarChart domain:", {
    //   start: new Date(domain[0]).toLocaleDateString(),
    //   end: new Date(domain[1]).toLocaleDateString(),
    //   rawDomain: domain,
    // });

    return domain;
  }, [parsed.length, xDomain]);

  // Calculate unique date ticks (one per calendar day)
  const calculatedTicks = useMemo(() => {
    if (parsed.length === 0) return undefined;

    // 1. Build regular 6-month interval ticks
    const allTicksRaw =
      Array.isArray(xAxisDomain) && typeof xAxisDomain[0] === "number"
        ? buildTimeTicks(xAxisDomain, { unit: "month", step: 6 })
        : undefined;

    if (!allTicksRaw) return undefined;

    // Clamp to domain
    const clampedAll = allTicksRaw.filter((t) => t >= xAxisDomain[0] && t <= xAxisDomain[1]);

    // Ensure unique and sorted
    const uniqSorted = (arr) => {
      const s = new Set();
      for (const v of arr) if (Number.isFinite(v)) s.add(v);
      return Array.from(s).sort((a, b) => a - b);
    };

    const allTicks = uniqSorted(clampedAll);

    // Thin ticks to fit
    const ticksRaw = thinTicksToFit(allTicks, (ms) => fmtMonthYear.format(ms), chartWidth);

    return uniqSorted(ticksRaw);
  }, [parsed.length, xAxisDomain, chartWidth]);

  //const MIN_CHART_WIDTH = xsChartWidth ?? 400;

  let maxYValue = maximumYValue ?? parsed.reduce((m, d) => Math.max(m, Number(d?.[yFieldKey] ?? -Infinity)), -Infinity);
  let minYValue = minimumYValue ?? parsed?.reduce((min, d) => Math.min(min, d[yFieldKey]), Infinity);
  maxYValue = parsed.length === 0 || maxYValue === -Infinity ? null : maxYValue;
  const yDomain = maxYValue ? [minYValue, maxYValue] : [minYValue, "auto"];

  const renderTitle = () => (
    <Typography variant="subtitle1" component="h4" color="secondary" sx={{ textAlign: "center" }}>
      {title}
    </Typography>
  );

  const renderXAxis = () => (
    <XAxis
      dataKey={xFieldKey}
      type="number"
      scale="time"
      domain={xAxisDomain}
      height={108}
      tick={{ fontSize: 12, fontWeight: 500, textAnchor: "middle" }}
      tickFormatter={(ts) => (xTickFormatter ? xTickFormatter(ts) : new Date(ts).toLocaleDateString())}
      tickMargin={12}
      ticks={calculatedTicks}
      interval="preserveStartEnd"
      padding={{ left: 30, right: 30 }}
    >
      {xLabel && xLabelVisible && <Label value={xLabel} offset={-8} position="insideBottom" />}
    </XAxis>
  );

  const renderYAxis = () => <YAxis domain={yDomain} minTickGap={4} stroke="#FFF" tick={false} width={10}/>;

  const renderToolTip = () => (
    <Tooltip
      itemStyle={{ fontSize: 10 }}
      labelStyle={{ fontSize: 10 }}
      animationBegin={0}
      animationDuration={0}
      // Use original timestamp in tooltip if available
      labelFormatter={(value, payload) => {
        if (tooltipLabelFormatter) {
          const originalValue = payload?.[0]?.payload?.originalTimestamp ?? value;
          return tooltipLabelFormatter(originalValue, payload);
        }
        return value;
      }}
      content={(props) => (
        <CustomTooltip
          {...props}
          yFieldKey={yFieldKey}
          xLabelKey="originalTimestamp"
          xFieldKey={xFieldKey}
          yLabel={yLabel}
          tooltipValueFormatter={tooltipValueFormatter}
          tooltipLabelFormatter={tooltipLabelFormatter}
        />
      )}
    />
  );

  const renderTruncationLine = () => {
    if (!wasTruncated || !truncationDate) {
      return null;
    }

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

  return (
    <>
      {renderTitle()}
      <Box
        sx={{
          width: {
            xs: 420,
            sm: chartWidth || 580,
            md: mdChartWidth || chartWidth || 580,
            lg: lgChartWidth || chartWidth || 580,
          },
          height: 250,
        }}
        key={id}
        className="chart-wrapper"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={30}>
          <BarChart
            margin={{
              top: 28,
              right: 20,
              left: 20,
              bottom: 10,
            }}
            data={parsed}
            style={{ width: "100%", maxWidth: "650px" }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderTruncationLine()}
            {renderXAxis()}
            {renderYAxis()}
            {renderToolTip()}
            <Bar dataKey={yFieldKey} maxBarSize={dynamicBarSize} barCategoryGap="20%" minPointSize={4}>
              {parsed.map((entry, index) => {
                const baseColor = entry[yFieldKey] >= entry.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
                const barColor = getBarColor(entry, baseColor);

                return <Cell key={`cell-${index}`} stroke={barColor} fill={barColor} />;
              })}
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
  xDomain: PropTypes.array,
  chartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  mdChartWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
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
  tooltipValueFormatter: PropTypes.func,
  data: PropTypes.array,
};
