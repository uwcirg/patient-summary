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

  // Process data to separate bars on the same calendar day
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
    // For 3 years: 3 years * 0.005 = ~5.5 days
    // For 1 month: 1 month * 0.005 = ~36 minutes (capped at minSpread)
    const minSpread = 2 * 60 * 60 * 1000; // Minimum: 2 hours
    const maxSpread = 7 * 24 * 60 * 60 * 1000; // Maximum: 7 days
    const dynamicSpreadWidth = Math.max(minSpread, Math.min(maxSpread, timeRangeMs * 0.005));

    console.log("BarChart - Dynamic spread calculation:", {
      timeRangeDays: (timeRangeMs / (24 * 60 * 60 * 1000)).toFixed(1),
      spreadWidthHours: (dynamicSpreadWidth / (60 * 60 * 1000)).toFixed(1),
    });

    // Group by calendar day (ignoring time)
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

    // Filter the PROCESSED data to last 2 years
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

  // React.useEffect(() => {
  //   console.log("BarChart - Truncation Debug:", {
  //     originalDataLength: processedData?.length,
  //     filteredDataLength: filteredData?.length,
  //     wasTruncated,
  //     truncationDate: truncationDate ? new Date(truncationDate).toLocaleDateString() : null,
  //     oldestDataPoint: processedData?.[0]
  //       ? new Date(processedData[0].originalDate || processedData[0][xFieldKey]).toLocaleDateString()
  //       : null,
  //   });
  // }, [processedData, filteredData, wasTruncated, truncationDate, xFieldKey]);

  // Convert date strings -> timestamps once
  const parsed = useMemo(
    () =>
      filteredData.map((d) => ({
        ...d,
        [xFieldKey]: d[xFieldKey] instanceof Date ? d[xFieldKey].getTime() : new Date(d[xFieldKey]).getTime(),
      })),
    [filteredData, xFieldKey],
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
    const targetBarWidth = Math.max(
      gapRatio * estimatedChartWidth * 0.5, // Proportional sizing
      20, // Minimum visible size
    );

    const calculatedBarSize = Math.min(targetBarWidth, 48);

    return calculatedBarSize;
  }, [parsed, xFieldKey, chartWidth]);

  // Calculate domain padding
  const xAxisDomain = useMemo(() => {
    if (parsed.length === 0) return ["dataMin", "dataMax"];

    const now = new Date().getTime();
    const cutoffYearsAgo = new Date();
    cutoffYearsAgo.setFullYear(cutoffYearsAgo.getFullYear() - CUT_OFF_YEAR);
    const cutoffTimestamp = cutoffYearsAgo.getTime();

    // Add padding (e.g., 1 month = ~30 days)
    const paddingMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    return [
      cutoffTimestamp - paddingMs, // Start: cutoff minus padding
      now + paddingMs, // End: now plus padding
    ];
  }, [parsed.length]);

  // Calculate unique date ticks (one per calendar day)
  const uniqueDateTicks = useMemo(() => {
    if (parsed.length === 0) return undefined;

    const uniqueDays = new Set();
    parsed.forEach((item) => {
      const timestamp = item.originalTimestamp || item[xFieldKey];
      const dateOnly = new Date(timestamp);
      dateOnly.setHours(0, 0, 0, 0);
      uniqueDays.add(dateOnly.getTime());
    });

    return Array.from(uniqueDays).sort((a, b) => a - b);
  }, [parsed, xFieldKey]);

  const MIN_CHART_WIDTH = xsChartWidth ?? 400;

  let maxYValue = maximumYValue ?? parsed.reduce((m, d) => Math.max(m, Number(d?.[yFieldKey] ?? -Infinity)), -Infinity);
  let minYValue = minimumYValue ?? parsed?.reduce((min, d) => Math.min(min, d[yFieldKey]), Infinity);
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
      scale="time"
      domain={xAxisDomain}
      height={108}
      tick={{ fontSize: 12, fontWeight: 500, textAnchor: "middle" }}
      tickFormatter={(ts) => (xTickFormatter ? xTickFormatter(ts) : new Date(ts).toLocaleDateString())}
      tickMargin={12}
      ticks={uniqueDateTicks}
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
        />
      )}
    />
  );

  const renderTruncationLine = () => {
    console.log("BarChart - renderTruncationLine called:", { wasTruncated, truncationDate });

    if (!wasTruncated || !truncationDate) {
      console.log("BarChart - Not rendering line:", { wasTruncated, truncationDate });
      return null;
    }

    console.log("BarChart - Rendering truncation line at:", new Date(truncationDate).toLocaleDateString());

    return (
      <ReferenceLine
        x={truncationDate}
        stroke="#999" 
        strokeWidth={3}
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
          width: { xs: MIN_CHART_WIDTH, sm: chartWidth, lg: lgChartWidth ?? chartWidth },
          height: 240,
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
            <Bar dataKey={yFieldKey} barSize={dynamicBarSize} maxBarSize={dynamicBarSize} barCategoryGap="20%" minPointSize={4}>
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
