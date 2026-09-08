import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";
export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-C-IDAS",
  questionnaireName: "c-idas",
  instrumentName: "C-IDAS",
  title: "C-IDAS",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/c-idas",
  scoringQuestionId: "c-ids-score",
  maximumScore: 36,
  chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 36, xLabel: "" },
};
