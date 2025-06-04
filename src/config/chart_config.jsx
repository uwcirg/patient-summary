import PropTypes from "prop-types";
import { isEmptyArray, getTomorrow, getDateObjectInLocalDateTime } from "../util/util";

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
    chartWidth: 520,
    lgChartWidth: 600,
    chartHeight: 520,
    xFieldKey: "date",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
    yFieldKey: "total",
    yLabel: "score",
    xLabel: "date",
    legendType: "none",
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

      let startDate = !isEmptyArray(dataTOUse) ? new Date(dataTOUse[0].date.valueOf()) : new Date();
      startDate.setMonth(0);
      startDate.setDate(0);
      startDate.setFullYear(startDate.getFullYear() - 1);
      dataTOUse.unshift({
        total: null,
        date: startDate.valueOf(),
      });
      dataTOUse.push({
        total: null,
        date: getTomorrow().valueOf(),
      });
      return dataTOUse.map((item) => {
        item.date = item.date.valueOf();
        return item;
      });
    },
    xTickFormatter: (item) => new Date(item).toISOString().substring(0, 10),
    tooltipLabelFormatter: (value, data) => {
      if (!isEmptyArray(data) && value > 0) return new Date(value).toISOString().substring(0, 10);
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

export const COLORS = [
  "#3E517A", 
  "#6564DB",
  "#78281F",
  "#F0386B",
  "#19647E",
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

export const LEGEND_ICON_TYPES = ["square", "rect", "circle", "triangle", "cross", "diamond", "star"];

Rect.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  color: PropTypes.string,
  value: PropTypes.number,
};
