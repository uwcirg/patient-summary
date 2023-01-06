import { getTomorrow } from "../util/util";

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
    chartHeight: 480,
    xFieldKey: "date",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
    yFieldKey: "total",
    yLabel: "score",
    xLabel: "date",
    yDomain: [0, 30],
    legendType: "none",
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ],
    dataFormatter: (data) => {
      data = data.map((item) => {
        item.date = new Date(item.date);
        return item;
      });
      data = data.sort((a, b) => a.date.getTime() - b.date.getTime());

      let startDate = data.length
        ? new Date(data[0].date.valueOf())
        : new Date();
      startDate.setMonth(0);
      startDate.setDate(0);
      startDate.setFullYear(startDate.getFullYear() - 1);
      data.unshift({
        total: null,
        date: startDate.valueOf(),
      });
      data.push({
        total: null,
        date: getTomorrow().valueOf(),
      });
      return data.map((item) => {
        item.date = item.date.valueOf();
        return item;
      });
    },
    xTickFormatter: (item) => new Date(item).toISOString().substring(0, 10),
    tooltipLabelFormatter: (value, data) => {
      if (data && data.length && value > 0)
        return new Date(value).toISOString().substring(0, 10);
      return "";
    },
  },
  "adl-iadl": {
    id: "adl-iadl",
    yDomain: [0, 50],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50
    ],
  },
  behav5: {
    id: "behav5",
    yDomain: [0, 6],
    yTicks: [0, 1, 2, 3, 4, 5, 6],
  },
  "c-idas": {
    id: "c-idas",
    yDomain: [0, 40],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
      39, 40,
    ],
  },
  "cp-ecog": {
    id: "cp-ecog",
    yDomain: [0, 50],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
      39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
    ],
  },
  ecog12: {
    id: "ecog12",
    yDomain: [0, 50],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
      39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
    ],
  },
  gad7: {
    id: "gad7",
    yDomain: [0, 22],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22,
    ],
  },
  gds: {
    id: "gds",
    yDomain: [0, 20],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ],
  },
  //specific graph config for each questionnaire here
  minicog: {
    id: "minicog",
    title: "Scores by Date",
    type: "linechart",
    yDomain: [0, 5],
    yTicks: [0, 1, 2, 3, 4, 5],
    // applicable only to line graph
    yLineFields: [
      {
        key: "word_recall",
        color: "#6d4c41",
        strokeWidth: 1,
        strokeDasharray: "4 2",
        legendType: "square",
        dot: (props) => <Rect {...props} color="#6d4c41"></Rect>,
      },
      {
        key: "clock_draw",
        color: "#5c6bc0",
        strokeWidth: 1,
        strokeDasharray: "4 2",
        legendType: "square",
        dot: (props) => <Rect {...props} color="#5c6bc0"></Rect>,
      },
      {
        key: "total",
        color: "#00897b",
        strokeWidth: 2,
      },
    ],
    tooltipLabelFormatter: (value, data) => {
      if (data && data.length && value > 0)
        return new Date(value).toISOString().substring(0, 10);
      return "";
    },
  },
  phq9: {
    id: "phq9",
    yDomain: [0, 28],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28,
    ],
  },
  slums: {
    id: "slums",
    yDomain: [0, 31],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
    ],
  },
};
export default CHART_CONFIG;
