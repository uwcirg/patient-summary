import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-SLUMS",
  questionnaireName: "slums",
  instrumentName: "SLUMS",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/slums",
  scoringQuestionId: "/71492-3",
  questionLinkIds: ["/71492-3"],
  maximumScore: 30,
  comparisonToAlert: "lower",
  chartParams: { ...CHART_CONFIG.default, title: "SLUMS", minimumYValue: 0, maximumYValue: 30, xLabel: "" },
};
