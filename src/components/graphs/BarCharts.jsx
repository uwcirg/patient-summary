import PropTypes from "prop-types";
import dayjs from "dayjs";
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
import {
  calculateXDomain,
  SUCCESS_COLOR,
  ALERT_COLOR,
  adjustBrightness,
  buildClampedThinnedTicks,
  CUT_OFF_YEARS_AGO
} from "@config/chart_config";
import CustomSourceTooltip from "./CustomSourceTooltip";
import { useDismissableOverlay } from "@/hooks/useDismissableOverlay";

export default function BarCharts(props) {
  const {
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
    tooltipValueFormatter,
    truncationTimestamp,
    data = [],
  } = props;

 
  const wrapperRef = React.useRef(null);
  const [forceHide, setForceHide] = React.useState(false);
  const [locked, setLocked] = React.useState(false); // sticky open (touch)
  const pointerTypeRef = React.useRef("mouse"); // 'mouse' | 'touch' | 'pen'
  const hideTimerRef = React.useRef(null);
  const lastActiveAtRef = React.useRef(0);

  const clearHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const hideTooltip = React.useCallback(() => {
    clearHideTimer();
    setLocked(false);
    setForceHide(true);
  }, []);

  useDismissableOverlay({ wrapperRef, onDismiss: hideTooltip });

  const showTooltip = React.useCallback(() => {
    clearHideTimer();
    setForceHide(false);
  }, []);

  const getBarColor = (entry, baseColor) => {
    // If no duplicates on this day, use base color
    if (!entry._duplicateCount || entry._duplicateCount === 1) {
      return baseColor;
    }

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
    cutoffYearsAgo.setFullYear(cutoffYearsAgo.getFullYear() - CUT_OFF_YEARS_AGO);
    const cutoffTimestamp = cutoffYearsAgo.getTime();

    // Check if any ORIGINAL data was truncated (before processing)
    const hasOlderData =
      truncationTimestamp ||
      data.some((item) => {
        const timestamp =
          item[xFieldKey] instanceof Date ? item[xFieldKey].getTime() : new Date(item[xFieldKey]).getTime();
        return timestamp < cutoffTimestamp || item.shouldBeTruncated;
      });

    // Filter the PROCESSED data to last years
    const filtered = processedData.filter((item) => {
      const timestamp = item.originalTimestamp || item[xFieldKey];
      return timestamp >= cutoffTimestamp;
    });

    let truncatedDateToUse;
    if (hasOlderData) {
      truncatedDateToUse = truncationTimestamp;
      if (!truncatedDateToUse) {
        const timestamps = filtered
          .map((d) => d.originalDate || d[xFieldKey])
          .filter((t) => t !== undefined && t !== null);
        if (timestamps.length > 0) {
          const minTimestamp = Math.min(...timestamps);
          // Include truncation date in the domain so the reference line is visible
          truncatedDateToUse = dayjs(new Date(minTimestamp)).subtract(6, "month").valueOf();
        }
      }
    }

    return {
      filteredData: filtered,
      wasTruncated: !!hasOlderData,
      truncationDate: hasOlderData ? truncatedDateToUse : null,
    };
  }, [data, processedData, xFieldKey, truncationTimestamp]);

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
    return calculateXDomain({
      filteredData,
      xFieldKey,
      wasTruncated,
      truncationDate,
      xDomain,
      cutoffYears: CUT_OFF_YEARS_AGO,
    });
  }, [filteredData, xFieldKey, wasTruncated, truncationDate, xDomain]);

  // Calculate unique date ticks (one per calendar day)
  const calculatedTicks = useMemo(() => {
    if (parsed.length === 0) return undefined;

    return buildClampedThinnedTicks({
      domain: xAxisDomain,
      stepMonths: 6, // bars: fixed 6-month tick spacing
      width: Number(chartWidth) || 580,
    });
  }, [parsed.length, xAxisDomain, chartWidth]);

  let maxYValue = maximumYValue ?? parsed.reduce((m, d) => Math.max(m, Number(d?.[yFieldKey] ?? -Infinity)), -Infinity);
  let minYValue = minimumYValue ?? parsed?.reduce((min, d) => Math.min(min, d[yFieldKey]), Infinity);
  maxYValue = parsed.length === 0 || maxYValue === -Infinity ? null : maxYValue;

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
      tickMargin={10}
      ticks={calculatedTicks}
      interval="preserveStartEnd"
      padding={{ left: 20, right: 20 }}
    >
      {xLabel && xLabelVisible && <Label value={xLabel} offset={-12} position="insideBottom" />}
    </XAxis>
  );

  const renderYAxis = () => {
    const padding = 0.5;
    const yDomain = maxYValue ? [minYValue, maxYValue + padding] : [minYValue, "auto"];
    return <YAxis domain={yDomain} minTickGap={4} stroke="#FFF" tick={false} width={10} />;
  };

  const TooltipWrapper = ({ active, payload, coordinate }) => {
    const isTouch = pointerTypeRef.current === "touch";

    // Touch + locked: ignore active jitter as long as we have a payload
    if (isTouch && locked) {
      if (!payload || !payload[0]) return null; // nothing to show
    } else {
      // Mouse (or unlocked touch): debounce brief active=false transitions
      if (active) {
        lastActiveAtRef.current = Date.now();
      } else {
        const dt = Date.now() - lastActiveAtRef.current;
        if (dt < 80) {
          // treat as still active to prevent flicker
        } else {
          return null;
        }
      }

      if (!payload || !payload[0]) return null;
    }

    const entry = payload[0].payload;
    const originalTimestamp = entry.originalTimestamp ?? entry[xFieldKey];

    const rect = wrapperRef.current?.getBoundingClientRect();
    const vx = rect ? rect.left + (coordinate?.x ?? 0) : 0;
    const vy = rect ? rect.top + (coordinate?.y ?? 0) : 0;

    return (
      <CustomSourceTooltip
        visible={!forceHide && (active || (pointerTypeRef.current === "touch" && locked))}
        position={{ x: vx, y: vy }}
        positionType="fixed"
        data={{
          date: originalTimestamp,
          value: entry[yFieldKey],
          source: entry.source,
          isNull: entry[yFieldKey] == null,
          meaning: entry.meaning,
        }}
        payload={entry}
        tooltipValueFormatter={tooltipValueFormatter}
        xFieldKey={xFieldKey}
        yFieldKey={yFieldKey}
        yLabel={yLabel}
        showMeaning={true}
      />
    );
  };

  TooltipWrapper.propTypes = {
    active: PropTypes.bool,
    label: PropTypes.any,
    coordinate: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number,
    }),
    payload: PropTypes.arrayOf(
      PropTypes.shape({
        payload: PropTypes.shape({
          originalTimestamp: PropTypes.number,
          [xFieldKey]: PropTypes.number,
          [yFieldKey]: PropTypes.any,
          source: PropTypes.string,
          meaning: PropTypes.string,
          highSeverityScoreCutoff: PropTypes.number,
        }),
      }),
    ),
  };
  const renderToolTip = () => {
    return (
      <Tooltip
        trigger="hover"
        content={(p) => <TooltipWrapper {...p} />}
        wrapperStyle={{ pointerEvents: "none" }}
        isAnimationActive={false}
      />
    );
  };

  const renderTruncationLine = () => {
    if (!wasTruncated || !truncationDate) {
      return null;
    }

    return (
      <ReferenceLine
        x={truncationDate}
        stroke="#9b9a9a"
        strokeWidth={2}
        strokeDasharray="3 3"
        label={{
          value: "data truncated",
          position: "top",
          fill: "#777",
          fontSize: 10,
          fontWeight: 500,
        }}
      />
    );
  };

  React.useEffect(() => {
    setForceHide(false);
    setLocked(false);
  }, [data]);

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
        ref={wrapperRef}
        className="chart-wrapper"
        onPointerEnter={(e) => {
          pointerTypeRef.current = e.pointerType || "mouse";
          if (pointerTypeRef.current === "mouse") {
            showTooltip();
          }
        }}
        onPointerDown={(e) => {
          pointerTypeRef.current = e.pointerType || "mouse";
          e.stopPropagation();

          // Touch: tap locks it open (no hover flicker)
          if (pointerTypeRef.current === "touch") {
            setLocked(true);
            showTooltip();
          } else {
            // Mouse: just ensure it's visible
            setLocked(false);
            showTooltip();
          }
        }}
        onPointerMove={(e) => {
          pointerTypeRef.current = e.pointerType || pointerTypeRef.current;
          // For mouse, ensure tooltip is shown when moving over chart
          if (pointerTypeRef.current === "mouse") {
            showTooltip();
          }
        }}
        onPointerLeave={(e) => {
          pointerTypeRef.current = e.pointerType || pointerTypeRef.current;
          // Mouse only: allow leaving to hide
          if (pointerTypeRef.current === "mouse") {
            hideTooltip(); // Use hideTooltip directly instead of setting a timer
          }
        }}
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
            style={{ width: "100%", maxWidth: "650px", touchAction: "manipulation" }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderTruncationLine()}
            {renderXAxis()}
            {renderYAxis()}
            {renderToolTip()}
            <Bar dataKey={yFieldKey} maxBarSize={dynamicBarSize} barCategoryGap="20%" minPointSize={4}>
              {parsed.map((entry, index) => {
                // eslint-disable-next-line
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
  truncationTimestamp: PropTypes.number,
  data: PropTypes.array,
};
