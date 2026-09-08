import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-BEHAV5",
  questionnaireName: "behav5",
  instrumentName: "BEHAV-5",
  title: "BEHAV-5",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/behav5",
  scoringQuestionId: "behav-8",
  maximumScore: 6,
  questionLinkIds: ["behav-1", "behav-2", "behav-3", "behav-4", "behav-5", "behav-6"],
  chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 6, xLabel: "" },
};
