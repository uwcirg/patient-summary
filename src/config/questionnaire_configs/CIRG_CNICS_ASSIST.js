import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG, { SUBSTANCE_USE_LINE_PROPS } from "@config/chart_config";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...BASE_CONFIG,
  instrumentName: "Substances Reported",
  questionnaireMatchMode: "strict",
  title: "Substances Reported",
  subtitle: "Past 3 months",
  disableHeaderRowSubtitle: true,
  minimumScore: 0,
  maximumScore: 4,
  meaningQuestionId: "ASSIST-3mo-score",
  meaningRowLabel: "Substances Reported (Past 3 months)",
  nullScoreAllowed: true,
  questionRowLabel: "Detailed Responses",
  fallbackScoreMap: {
    "assist-10-0": 0,
    "assist-10-1": 1,
    "assist-10-2": 2,
    "assist-10-3": 3,
    "assist-10-4": 4,
    "assist-11-0": 0,
    "assist-11-1": 1,
    "assist-11-2": 2,
    "assist-11-3": 3,
    "assist-11-4": 4,
    "assist-12-0": 0,
    "assist-12-1": 1,
    "assist-12-2": 2,
    "assist-12-3": 3,
    "assist-12-4": 4,
    "assist-13-0": 0,
    "assist-13-1": 1,
    "assist-13-2": 2,
    "assist-13-3": 3,
    "assist-13-4": 4,
    "assist-14-0": 0,
    "assist-14-1": 1,
    "assist-14-2": 2,
    "assist-14-3": 3,
    "assist-14-4": 4,
    "assist-15-0": 0,
    "assist-15-1": 1,
    "assist-15-2": 2,
    "assist-15-3": 3,
    "assist-15-4": 4,
    "assist-16-0": 0,
    "assist-16-1": 1,
    "assist-16-2": 2,
    "assist-16-3": 3,
    "assist-16-4": 4,
    "assist-17-0": 0,
    "assist-17-1": 1,
    "assist-17-2": 2,
    "assist-17-3": 3,
    "assist-17-4": 4,
    "assist-18-0": 0,
    "assist-18-1": 1,
    "assist-18-2": 2,
    "assist-18-3": 3,
    "assist-18-4": 4,
    "assist-19-0": 0,
    "assist-19-1": 1,
    "assist-19-2": 2,
    "assist-19-3": 3,
    "assist-19-4": 4,
  },
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const meaningResponse = responses.find((response) => linkIdEquals(response.id, "ASSIST-3mo-score", "strict"));
    const meaningAnswer =
      meaningResponse?.answer != null && meaningResponse.answer !== undefined ? meaningResponse.answer : null;
    return meaningAnswer?.split(",").join("|");
  },
  subScoringQuestions: [
    { key: "ASSIST-10", linkId: "ASSIST-10" },
    { key: "ASSIST-11", linkId: "ASSIST-11" },
    { key: "ASSIST-12", linkId: "ASSIST-12" },
    { key: "ASSIST-13", linkId: "ASSIST-13" },
    { key: "ASSIST-14", linkId: "ASSIST-14" },
    { key: "ASSIST-15", linkId: "ASSIST-15" },
    { key: "ASSIST-16", linkId: "ASSIST-16" },
    { key: "ASSIST-17", linkId: "ASSIST-17" },
    { key: "ASSIST-18", linkId: "ASSIST-18" },
    { key: "ASSIST-19", linkId: "ASSIST-19" },
  ],
  yLineFields: [
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-10", label: "Cocaine/crack", color: "#0072B2" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-11", label: "Methamphetamine", color: "#D55E00" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-12", label: "Heroin", color: "#009E73" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-13", label: "Fentanyl", color: "#CC79A7" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-14", label: "Narcotic pain meds", color: "#56B4E9" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-15", label: "Sedatives", color: "#E69F00" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-16", label: "Marijuana", color: "#8884FF" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-17", label: "Stimulants", color: "#545E56" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-18", label: "Inhalants", color: "#FF5555" },
    { ...SUBSTANCE_USE_LINE_PROPS, key: "ASSIST-19", label: "Psychedelics", color: "#3DB6B1" },
  ],
  displayMeaningNotScore: true,
  xLabel: "",
  chartParams: {
    ...CHART_CONFIG.default,
    title: "Substances Reported",
    chartHeight: 420,
    interval: 0,
    xsChartHeight: 460,
    minimumYValue: 0,
    maximumYValue: 4,
    chartMargin: { top: 52, right: 20, left: 20, bottom: 10 },
    yLabel: "Frequency",
    yLabelVisible: true,
    yTickFormatter: (value) => {
      const labels = { 0: "Never", 1: "Once/Twice", 2: "Monthly", 3: "Weekly", 4: "Daily" };
      return labels[value] || value;
    },
    yTicks: [0, 1, 2, 3, 4],
    showTooltipMeaning: false,
    isCategoricalY: true,
    yLabelProps: { position: "top", angle: 0, dy: -16, fontSize: "10px" },
    showYTicks: true,
    connectNulls: true,
    tooltipValueFormatter: (value) => {
      if (value == null || value === undefined) return null;
      if (value === 0) return "Never";
      if (value === 1) return "Once or twice";
      if (value === 2) return "Monthly";
      if (value === 3) return "Weekly";
      if (value === 4) return "Daily or almost daily";
      return null;
    },
    wrapperClass: "big",
    dotRadius: 5,
    activeDotRadius: 6,
    lineType: "monotone",
    jitterSpreadDays: 16,
    enableLineSwitches: true,
    noDataText: "Not Answered",
  },
};
