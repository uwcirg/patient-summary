const CHART_CONFIG = {
  default: {
    type: "barchart",
    title: "Total Score by Date",
    chartWidth: 580,
    chartHeight: 480,
    xFieldKey: "date",
    yFieldKey: "total",
    xAxisTitle: "Date",
    yAxisTitle: "Score",
  },
  //specific graph config for each questionnaire here
  //"minicog": {},
  //"phq9": {}
};
export default CHART_CONFIG;
