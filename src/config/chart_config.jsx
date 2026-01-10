import PropTypes from "prop-types";
import { isEmptyArray, getDateObjectInLocalDateTime, getLocaleDateStringFromDate} from "@util";

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
    lgChartWidth: 580,
    mdChartWidth: 480,
    chartHeight: 240,
    xFieldKey: "date",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
    yFieldKey: "total",
    yLabel: "score",
    xLabel: "date",
    yLabelVisible: false,
    xLabelVisible: false,
    legendType: "none",
    showTicks: false,
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
    // xTickFormatter: (item) => new Date(item).toISOString().substring(0, 10),
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
        key: "total",
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

export const SUCCESS_COLOR = "green";
export const ALERT_COLOR = "#b71c1c";
export const WARNING_COLOR = "#e65100";

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
 * - Single date  => expands by ±singlePointWindowDays
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

// --- build aligned ticks (month/quarter/year) ---
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

function addStepUTC(ms, unit, step) {
  const d = new Date(ms);
  if (unit === "day") return ms + step * 86400000;
  if (unit === "week") return ms + step * 7 * 86400000;
  if (unit === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + step, 1);
  return Date.UTC(d.getUTCFullYear() + step, 0, 1);
}

// Measure text width to thin ticks to avoid overlap
function measureLabelWidth(text, font = "12px sans-serif") {
  const c = measureLabelWidth._c || (measureLabelWidth._c = document.createElement("canvas"));
  const ctx = c.getContext("2d");
  ctx.font = font;
  return ctx.measureText(String(text)).width;
}

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

// Label formatters
export const fmtMonthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
export const fmtISO = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});
