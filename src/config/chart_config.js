const CHART_CONFIG = {
  default: {
    type: "barchart",
    title: "Total Score by Date",
    chartWidth: 500,
    chartHeight: 540,
    xFieldKey: "date",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
    yFieldKey: "total",
    yLabel: "score",
    xLabel: "date",
  },
  //specific graph config for each questionnaire here
  minicog: {
    id: "minicog",
    title: "Scores by Date",
    maxYValue: 5,
    type: "linechart",
    yDomain: [0, 5],
    yTicks: [0, 1, 2, 3, 4, 5],
    dataFormatter: (data) => {
      let startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      data.unshift({
        word_recall: null,
        clock_draw: null,
        total: null,
        date: startDate.valueOf(),
      });
      data.push({
        word_recall: null,
        clock_draw: null,
        total: null,
        date: new Date().valueOf(),
      });
      return data.map((item) => {
        item = item.valueOf();
        return item;
      });
    },
    xTickFormatter: (item) => new Date(item).toISOString().substring(0, 10),
    yFields: [
      {
        key: "word_recall",
        color: "#7e57c2",
        strokeWidth: 1,
        strokeDasharray: "4 2",
      },
      {
        key: "clock_draw",
        color: "#5c6bc0",
        strokeWidth: 1,
        strokeDasharray: "4 2",
      },
      {
        key: "total",
        color: "#004d40",
      },
    ],
  },
  phq9: {
    id: "phq9",
    maxYValue: 27,
    type: "linechart",
    legendType: "none",
    yDomain: [0, 27],
    yTicks: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27,
    ],
    dataFormatter: (data) => {
      data = data.map((item) => {
        item.date = new Date(item.date);
        return item;
      });
      let startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      data.unshift({
        total: null,
        date: startDate.valueOf(),
      });
      data.push({
        total: null,
        date: new Date().valueOf(),
      });
      return data.map((item) => {
        item = item.valueOf();
        return item;
      });
    },
    xTickFormatter: (item) => new Date(item).toISOString().substring(0, 10),
  },
};
export default CHART_CONFIG;
