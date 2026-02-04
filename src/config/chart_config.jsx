import PropTypes from "prop-types";
import { isEmptyArray, getDateObjectInLocalDateTime, getLocaleDateStringFromDate } from "@util";

export const SUCCESS_COLOR = "green";
export const ALERT_COLOR = "#b71c1c";
export const WARNING_COLOR = "#e65100";
export const CUT_OFF_YEARS_AGO = 5;
const getCutoffDate = () => {
  const cutoffYearsAgo = new Date();
  cutoffYearsAgo.setFullYear(cutoffYearsAgo.getFullYear() - CUT_OFF_YEARS_AGO);
  return cutoffYearsAgo;
};
export const CUT_OFF_TIMESTAMP_ON_GRAPH = getCutoffDate().getTime();
const Rect = (props) => {
  const { cx, cy, color, value } = props;
  if (!cx && !(parseInt(cx) === 0)) return null;
  if (!cy && !(parseInt(cy) === 0)) return null;
  return (
    <rect
      x={cx - 3}
      y={cy - 3}
      width={6}
      height={6}
      fill={color}
      strokeWidth={1}
      key={`${value}_${parseInt(cx)}_${parseInt(cy)}`}
    ></rect>
  );
};
const CHART_CONFIG = {
  default: {
    type: "linechart",
    title: "Total Score by Date",
    xsChartWidth: 400,
    chartWidth: 580,
    dotColor: "#444",
    dotRadius: 4,
    cutoffTimestamp: CUT_OFF_TIMESTAMP_ON_GRAPH,
    activeDotRadius: 5,
    interval: 2,
    lgChartWidth: 588,
    mdChartWidth: 480,
    chartHeight: 240,
    xFieldKey: "date",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
    yFieldKey: "score",
    yLabel: "score",
    xLabel: "date",
    yLabelVisible: false,
    xLabelVisible: false,
    legendType: "none",
    showYTicks: false,
    showXTicks: true,
    showTooltipScore: true,
    showTooltipMeaning: true,
    connectNulls: false,
    dataFormatter: (data) => {
      if (isEmptyArray(data)) return data;
      let dataTOUse = JSON.parse(JSON.stringify(data));
      dataTOUse = dataTOUse
        .filter((item) => !!item.date)
        .map((item) => {
          item.date = getDateObjectInLocalDateTime(item.date);
          return item;
        });
      dataTOUse = dataTOUse.sort((a, b) => a.date.getTime() - b.date.getTime());
      return dataTOUse.map((item) => {
        item.date = item.date.valueOf();
        return item;
      });
    },
    xTickFormatter: (value) => {
      const d = value instanceof Date ? value : new Date(value);
      if (isNaN(d)) return "";
      return d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    },
    tooltipLabelFormatter: (value, data) => {
      if (!isEmptyArray(data) && value > 0) return getLocaleDateStringFromDate(value);
      return "";
    },
  },
  //specific graph config for each questionnaire here
  minicog: {
    id: "minicog",
    keys: ["CIRG-MINICOG", "MINICOG"],
    title: "Scores by Date",
    type: "linechart",
    // applicable only to line graph
    yLineFields: [
      {
        key: "word_recall_score",
        color: "#6d4c41",
        strokeWidth: 1,
        strokeDasharray: "4 2",
        legendType: "square",
        dot: (props) => {
          const { key, ...otherProps } = props;
          return <Rect key={key} {...otherProps} color="#6d4c41"></Rect>;
        },
      },
      {
        key: "clock_draw_score",
        color: "#5c6bc0",
        strokeWidth: 1,
        strokeDasharray: "6 2",
        legendType: "square",
        dot: (props) => {
          const { key, ...otherProps } = props;
          return <Rect key={key} {...otherProps} color="#5c6bc0"></Rect>;
        },
      },
      {
        key: "score",
        color: "#00897b",
        strokeWidth: 2,
      },
    ],
    tooltipLabelFormatter: (value, data) => {
      if (!isEmptyArray(data) && value > 0) return new Date(value).toISOString().substring(0, 10);
      return "";
    },
  },
};
export default CHART_CONFIG;

export const SUBSTANCE_USE_LINE_PROPS = {
  strokeWidth: 1,
  strokeOpacity: 0.15,
};
export const COLORS = [
  "#3E517A",
  "#1976d2",
  "#6564DB",
  "#78281F",
  "#F0386B",
  "#6b7703",
  "#232C33",
  "#9F6BA0",
  "#B36A5E",
  "#5C5D8D",
  "#a387dd",
  "#e65100",
  "#5E9CBC",
  "#BC5EA6",
  "#304ffe",
  "#3f51b5",
  "#673ab7",
  "#D68C72",
  "#880e4f",
  "#B404AE",
  "#2196f3",
  "#fb8c00",
  "#6200ea",
  "#009688",
  "#880e4f",
  "#96008B",
  "#9e9d24",
  "#ff9800",
  "#ffeb3b",
  "#795548",
  "#607d8b",
  "#006064",
  "#ff8a80",
  "#00bcd4",
  "#757575",
  "#455a64",
  "#c0ca33",
  "#B633CA",
  "#33AACA",
];

export const LEGEND_ICON_TYPES = ["square", "circle", "rect", "triangle", "cross", "diamond", "star"];

Rect.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  color: PropTypes.string,
  value: PropTypes.number,
};

/**
 * Compute a safe, padded domain for an array of timestamps (ms).
 * - Empty array => ["auto","auto"] (or [0,1] if allowAutoFallback=false)
 * - Single date  => expands by +-singlePointWindowDays
 * - Multiple     => padded by `padding` fraction
 */
export function getDateDomain(
  dates = [],
  {
    padding = 0.05, // 5% pad on each side for multi-point ranges
    allowAutoFallback = true, // use ["auto","auto"] when empty
    singlePointWindowDays = 30, // +-30 days around a single point
  } = {},
) {
  if (isEmptyArray(dates)) {
    return allowAutoFallback ? ["auto", "auto"] : [0, 1];
  }

  const min = Math.min(...dates);
  const max = Math.max(...dates);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return allowAutoFallback ? ["auto", "auto"] : [0, 1];
  }

  // Single point: open a window around it (±days)
  if (max === min) {
    const days = Math.max(1, Math.floor(singlePointWindowDays));
    const halfWindowMs = days * 24 * 60 * 60 * 1000;
    return [min - halfWindowMs, max + halfWindowMs];
  }

  // Normal range with fractional padding
  const range = max - min;
  return [min - range * padding, max + range * padding];
}

/**
 * Builds aligned time ticks for chart axes
 * @param {[number, number]} domain - Array of [minMs, maxMs] in milliseconds
 * @param {Object} options - Configuration options
 * @param {string} options.unit - Time unit: "day", "week", "month", or "year" (default: "month")
 * @param {number} options.step - Step size for the unit (default: 3)
 * @param {number} options.weekStartsOn - Day of week start (0=Sunday, 1=Monday, etc.) (default: 0)
 * @returns {number[]} Array of tick timestamps in milliseconds
 */
export function buildTimeTicks([minMs, maxMs], { unit = "month", step = 3, weekStartsOn = 0 } = {}) {
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs) || maxMs <= minMs) return [];
  const startOfDayUTC = (ms) => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  const startOfWeekUTC = (ms, ws = 0) => {
    const d = new Date(ms);
    const diff = (d.getUTCDay() - ws + 7) % 7;
    return startOfDayUTC(ms) - diff * 86400000;
  };
  const startOfMonthUTC = (ms) => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  };
  const startOfYearUTC = (ms) => {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), 0, 1);
  };

  let cur =
    unit === "day"
      ? startOfDayUTC(minMs)
      : unit === "week"
        ? startOfWeekUTC(minMs, weekStartsOn)
        : unit === "month"
          ? startOfMonthUTC(minMs)
          : startOfYearUTC(minMs);

  if (unit === "month" && step > 1) {
    const d = new Date(cur);
    const m = d.getUTCMonth();
    cur = Date.UTC(d.getUTCFullYear(), Math.floor(m / step) * step, 1);
  }
  if (cur < minMs) cur = addStepUTC(cur, unit, step);

  const ticks = [];
  while (cur <= maxMs) {
    ticks.push(cur);
    cur = addStepUTC(cur, unit, step);
  }
  return ticks;
}

/**
 * Adds a time step to a UTC timestamp
 * @param {number} ms - Starting timestamp in milliseconds
 * @param {string} unit - Time unit: "day", "week", "month", or "year"
 * @param {number} step - Number of units to add
 * @returns {number} New timestamp in milliseconds
 */
function addStepUTC(ms, unit, step) {
  const d = new Date(ms);
  if (unit === "day") return ms + step * 86400000;
  if (unit === "week") return ms + step * 7 * 86400000;
  if (unit === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + step, 1);
  return Date.UTC(d.getUTCFullYear() + step, 0, 1);
}

/**
 * Measures the rendered width of text using canvas
 * @param {string} text - Text to measure
 * @param {string} font - CSS font string (default: "12px sans-serif")
 * @returns {number} Width in pixels
 */
function measureLabelWidth(text, font = "12px sans-serif") {
  const c = measureLabelWidth._c || (measureLabelWidth._c = document.createElement("canvas"));
  const ctx = c.getContext("2d");
  ctx.font = font;
  return ctx.measureText(String(text)).width;
}

/**
 * Calculates a domain from a cutoff date to now with padding
 * @param {Object} options - Configuration options
 * @param {number} options.years - Number of years to look back (default: 5)
 * @param {number} options.now - Current timestamp in milliseconds (default: Date.now())
 * @param {number} options.paddingDays - Padding in days on each side (default: 30)
 * @returns {[number, number]} Domain array [cutoff, now+padding]
 */
export function getCutoffDomain({ years = 5, now = Date.now(), paddingDays = 30 }) {
  const yearsAgo = new Date(now);
  yearsAgo.setFullYear(yearsAgo.getFullYear() - years);
  const cutoff = yearsAgo.getTime();
  const paddingMs = paddingDays * 24 * 60 * 60 * 1000;
  return [cutoff - paddingMs, now + paddingMs];
}

/**
 * Calculate X-axis domain for charts with optional data truncation
 * @param {Object} params
 * @param {Array} params.filteredData - The filtered data array
 * @param {string|number} params.xFieldKey - The key for x-axis values
 * @param {boolean} params.wasTruncated - Whether data was truncated
 * @param {number} params.truncationDate - The truncation timestamp
 * @param {Array} params.xDomain - Custom domain override (optional)
 * @param {number} params.cutoffYears - Number of years to look back (default: 5)
 * @returns {Array} Domain array [min, max]
 */
export const calculateXDomain = ({
  filteredData,
  xFieldKey,
  wasTruncated,
  truncationDate,
  xDomain = null,
  cutoffYears = 5,
}) => {
  // If we have a custom xDomain prop and no truncation, use it
  if (xDomain && !wasTruncated) {
    return xDomain;
  }

  // If data was truncated, calculate domain from actual filtered data
  if (wasTruncated && filteredData.length > 0) {
    const timestamps = filteredData
      .map((d) => d.originalDate || d[xFieldKey])
      .filter((t) => t !== undefined && t !== null);

    if (timestamps.length > 0) {
      const minTimestamp = Math.min(...timestamps);
      const maxTimestamp = Math.max(...timestamps);

      // Add padding (e.g., 1 month = ~30 days)
      const paddingMs = 30 * 24 * 60 * 60 * 1000;

      // Include truncation date in the domain so the reference line is visible
      const domainMin = truncationDate ? Math.min(minTimestamp, truncationDate) : minTimestamp;

      return [domainMin - paddingMs, maxTimestamp + paddingMs];
    }
  }

  // Fallback: calculate domain from cutoff to now
  const now = new Date().getTime();
  const yearsAgo = new Date();
  yearsAgo.setFullYear(yearsAgo.getFullYear() - cutoffYears);
  const cutoffTimestamp = yearsAgo.getTime();

  // Add padding (e.g., 1 month = ~30 days)
  const paddingMs = 30 * 24 * 60 * 60 * 1000;

  return [cutoffTimestamp - paddingMs, now + paddingMs];
};

export function uniqSorted(arr) {
  const s = new Set();
  for (const v of arr || []) if (Number.isFinite(v)) s.add(v);
  return Array.from(s).sort((a, b) => a - b);
}

/**
 * Thins tick array to fit within chart width without label overlap
 * @param {number[]} ticks - Array of tick values
 * @param {Function} formatter - Function to format tick labels for measurement
 * @param {number} chartWidth - Total chart width in pixels
 * @param {Object} options - Configuration options
 * @param {number} options.leftPadding - Left padding in pixels (default: 50)
 * @param {number} options.rightPadding - Right padding in pixels (default: 30)
 * @param {number} options.minGap - Minimum gap between labels in pixels (default: 8)
 * @param {string} options.font - CSS font string for measurement (default: "12px sans-serif")
 * @returns {number[]} Thinned array of ticks
 */
export function thinTicksToFit(
  ticks,
  formatter,
  chartWidth,
  { leftPadding = 50, rightPadding = 30, minGap = 8, font = "12px sans-serif" } = {},
) {
  if (!ticks?.length || !Number.isFinite(chartWidth)) return ticks || [];
  const inner = Math.max(0, chartWidth - leftPadding - rightPadding);
  const maxW = Math.max(...ticks.map((t) => measureLabelWidth(formatter(t), font)), 0);
  if (maxW === 0) return ticks;
  const maxCount = Math.max(1, Math.floor(inner / (maxW + minGap)));
  if (ticks.length <= maxCount) return ticks;
  const k = Math.ceil(ticks.length / maxCount);
  return ticks.filter((_, i) => i % k === 0);
}

/**
 * Builds time ticks, clamps to domain, removes duplicates, and thins to fit width
 * @param {Object} params - Configuration object
 * @param {[number, number]} params.domain - Domain array [min, max] in milliseconds
 * @param {number} params.stepMonths - Step size in months
 * @param {number} params.width - Chart width in pixels
 * @returns {number[]|undefined} Array of tick timestamps, or undefined if invalid domain
 */
export function buildClampedThinnedTicks({ domain, stepMonths, width }) {
  if (!Array.isArray(domain) || typeof domain[0] !== "number") return undefined;

  const allTicksRaw = buildTimeTicks(domain, { unit: "month", step: stepMonths });
  const clamped = allTicksRaw.filter((t) => t >= domain[0] && t <= domain[1]);
  const allTicks = uniqSorted(clamped);

  const effectiveWidth = Number(width) || 580;
  const thinned = thinTicksToFit(allTicks, (ms) => fmtMonthYear.format(ms), effectiveWidth);

  return uniqSorted(thinned);
}

// Label formatters
export const fmtMonthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
export const fmtISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

/**
 * Gets dot color for chart points, adjusting brightness for duplicates
 * @param {Object} entry - Data entry with duplicate metadata
 * @param {number} entry._duplicateCount - Total number of duplicates on this date
 * @param {number} entry._duplicateIndex - Index of this duplicate (0-based)
 * @param {string} baseColor - Base hex color (e.g., "#FF5733")
 * @returns {string} Hex color string
 */
export const getDotColor = (entry, baseColor) => {
  // If no duplicates on this day, use base color
  if (!entry._duplicateCount || entry._duplicateCount === 1) {
    return baseColor;
  }

  // For duplicates, adjust the brightness based on index
  // Adjust brightness: first dot darker, last dot lighter
  const brightnessStep = 5; // Adjust this value for more/less variation
  const adjustment = (entry._duplicateIndex - Math.floor(entry._duplicateCount / 2)) * brightnessStep;

  return adjustBrightness(baseColor, adjustment);
};

/**
 * Converts a hex color to RGB object
 * @param {string} hex - Hex color string (e.g., "#FF5733")
 * @returns {{r: number, g: number, b: number}|null} RGB object or null if invalid
 */
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

/**
 * Converts RGB values to hex color string
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color string (e.g., "#FF5733")
 */
export const rgbToHex = (r, g, b) => {
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

/**
 * Adjusts the brightness of a hex color
 * @param {string} color - Hex color string (e.g., "#FF5733")
 * @param {number} amount - Amount to adjust brightness (-255 to 255, negative for darker)
 * @returns {string} Adjusted hex color string
 */
export const adjustBrightness = (color, amount) => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  return rgbToHex(
    Math.min(255, Math.max(0, rgb.r + amount)),
    Math.min(255, Math.max(0, rgb.g + amount)),
    Math.min(255, Math.max(0, rgb.b + amount)),
  );
};
/**
 * Converts a hex color to rgba with opacity
 * @param {string} color - Hex color (e.g., "#FF5733")
 * @param {number} opacity - Opacity (0-1)
 * @returns {string} RGBA color string
 */
export const hexToRgba = (color, opacity = 0.5) => {
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

  const rgb = hexToRgb(color);
  if (!rgb) return color;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};
