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
    chartHeight: 520,
    xFieldKey: "date",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
    yFieldKey: "total",
    yLabel: "score",
    xLabel: "date",
    legendType: "none",
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
  //specific graph config for each questionnaire here
  minicog: {
    id: "minicog",
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
        dot: (props) => <Rect {...props} color="#6d4c41"></Rect>,
      },
      {
        key: "clock_draw_score",
        color: "#5c6bc0",
        strokeWidth: 1,
        strokeDasharray: "6 2",
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
};
export default CHART_CONFIG;
