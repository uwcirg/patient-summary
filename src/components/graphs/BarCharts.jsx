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
import React, { useMemo, useEffect, useRef, useSyncExternalStore } from "react";
import {
  calculateXDomain,
  SUCCESS_COLOR,
  ALERT_COLOR,
  adjustBrightness,
  buildClampedThinnedTicks,
  CUT_OFF_YEARS_AGO,
} from "@config/chart_config";
import CustomSourceTooltip from "./CustomSourceTooltip";
import { useDismissableOverlay } from "@/hooks/useDismissableOverlay";

// Minimal external store for pointer-interaction state (pointer type, touch-lock,
// force-hide, tooltip rect, and debounced "recently active" flag). Writes here never
// trigger a re-render of BarCharts/BarChart — only components that call
// useSyncExternalStore against this store (i.e. TooltipWrapper) re-render, which keeps
// pointer-move handling from re-rendering the whole chart while staying render-safe
// (no ref reads during render).
function createInteractionStore() {
  let state = {
    pointerType: "mouse",
    locked: false,
    forceHide: false,
    recentlyActive: false,
    rect: null,
  };
  const listeners = new Set();

  return {
    getSnapshot: () => state,
    setState: (partial) => {
      state = { ...state, ...partial };
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const TooltipWrapper = React.memo(function TooltipWrapper({
  active,
  payload,
  coordinate,
  store,
  xFieldKey,
  yFieldKey,
  yLabel,
  tooltipValueFormatter,
}) {
  const interaction = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const hideTimerRef = useRef(null);

  // Debounce the "recently active" flag so brief gaps in Recharts' own active/inactive
  // toggling (mouse mode) don't flicker the tooltip. This replaces the old
  // Date.now()-during-render comparison — the clock read now happens in an effect,
  // and render just reads the resulting boolean off the store snapshot.
  useEffect(() => {
    if (active) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      store.setState({ recentlyActive: true });
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      store.setState({ recentlyActive: false });
    }, 80);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [active, store]);

  const isTouch = interaction.pointerType === "touch";

  if (isTouch && interaction.locked) {
    if (!payload || !payload[0]) return null;
  } else {
    if (!interaction.recentlyActive) return null;
    if (!payload || !payload[0]) return null;
  }

  const entry = payload[0].payload;
  const originalTimestamp = entry.originalTimestamp ?? entry[xFieldKey];
  const rect = interaction.rect;
  const vx = rect ? rect.left + (coordinate?.x ?? 0) : 0;
  const vy = rect ? rect.top + (coordinate?.y ?? 0) : 0;

  return (
    <CustomSourceTooltip
      visible={!interaction.forceHide && (active || (isTouch && interaction.locked))}
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
});

TooltipWrapper.propTypes = {
  active: PropTypes.bool,
  coordinate: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      payload: PropTypes.object,
    }),
  ),
  store: PropTypes.shape({
    getSnapshot: PropTypes.func,
    setState: PropTypes.func,
    subscribe: PropTypes.func,
  }),
  xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  yLabel: PropTypes.string,
  tooltipValueFormatter: PropTypes.func,
};

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
  const [store] = React.useState(() => createInteractionStore());

  const hideTooltip = React.useCallback(() => {
    store.setState({ locked: false, forceHide: true });
  }, [store]);

  useDismissableOverlay({ wrapperRef, onDismiss: hideTooltip });

  // Track the wrapper's viewport rect via ResizeObserver instead of calling
  // getBoundingClientRect() during render. Rect updates go through the store, so
  // TooltipWrapper can read the latest rect from its snapshot without touching the DOM
  // itself. React 19 supports returning a cleanup function directly from a ref callback.
  const setWrapperRef = React.useCallback(
    (node) => {
      wrapperRef.current = node;
      if (!node) return undefined;

      const updateRect = () => {
        const r = node.getBoundingClientRect();
        store.setState({ rect: { left: r.left, top: r.top } });
      };
      updateRect();

      const resizeObserver = new ResizeObserver(updateRect);
      resizeObserver.observe(node);
      window.addEventListener("scroll", updateRect, true);
      window.addEventListener("resize", updateRect);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("scroll", updateRect, true);
        window.removeEventListener("resize", updateRect);
      };
    },
    [store],
  );

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
    return <YAxis domain={yDomain} minTickGap={4} stroke="#FFF" tick={false} width={5} />;
  };

  const renderTooltipContent = React.useCallback(
    (p) => (
      <TooltipWrapper
        {...p}
        store={store}
        xFieldKey={xFieldKey}
        yFieldKey={yFieldKey}
        yLabel={yLabel}
        tooltipValueFormatter={tooltipValueFormatter}
      />
    ),
    [store, xFieldKey, yFieldKey, yLabel, tooltipValueFormatter],
  );

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
    store.setState({ forceHide: false, locked: false });
  }, [data, store]);

  return (
    <>
      {renderTitle()}
      <Box
        sx={{
          width: {
            xs: 400,
            sm: chartWidth || 580,
            md: mdChartWidth || chartWidth || 580,
            lg: lgChartWidth || chartWidth || 580,
          },
          height: 240,
          maxWidth: "100%",
        }}
        ref={setWrapperRef}
        className="chart-wrapper"
        onPointerEnter={(e) => {
          const pointerType = e.pointerType || "mouse";
          store.setState(pointerType === "mouse" ? { pointerType, forceHide: false } : { pointerType });
        }}
        onPointerDown={(e) => {
          const pointerType = e.pointerType || "mouse";
          e.stopPropagation();
          store.setState({ pointerType, locked: pointerType === "touch", forceHide: false });
        }}
        onPointerMove={(e) => {
          const pointerType = e.pointerType || store.getSnapshot().pointerType;
          store.setState(pointerType === "mouse" ? { pointerType, forceHide: false } : { pointerType });
        }}
        onPointerLeave={(e) => {
          const pointerType = e.pointerType || store.getSnapshot().pointerType;
          store.setState(pointerType === "mouse" ? { pointerType, locked: false, forceHide: true } : { pointerType });
        }}
      >
        <ResponsiveContainer minWidth={100} minHeight={30}>
          <BarChart
            margin={{
              top: 14,
              right: 24,
              left: 24,
              bottom: 10,
            }}
            data={parsed}
            style={{ maxWidth: "650px", touchAction: "manipulation" }}
          >
            <CartesianGrid strokeDasharray="2 2" horizontal={false} vertical={false} fill="#fdfbfbff" />
            {renderTruncationLine()}
            {renderXAxis()}
            {renderYAxis()}
            <Tooltip
              content={renderTooltipContent}
              wrapperStyle={{ pointerEvents: "none" }}
              isAnimationActive={false}
            />
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
