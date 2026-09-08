import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-GAD7",
  questionnaireName: "gad7",
  instrumentName: "GAD-7",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/gad7",
  scoringQuestionId: "/70274-6",
  maximumScore: 21,
  questionLinkIds: ["/69725-0", "/68509-9", "/69733-4", "/69734-2", "/69735-9", "/69689-8", "/69736-7"],
  severityBands: [
    { min: 15, label: "high", meaning: "severe anxiety" },
    { min: 10, label: "moderate", meaning: "moderate anxiety" },
    { min: 5, label: "mild", meaning: "mild anxiety" },
    { min: 0, label: "low", meaning: "minimal anxiety" },
  ],
  highSeverityScoreCutoff: 15,
  mediumSeverityScoreCutoff: 10,
  chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 21, xLabel: "", dotColor: null },
};
