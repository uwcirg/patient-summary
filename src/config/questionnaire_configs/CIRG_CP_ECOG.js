import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-CP-ECOG",
  questionnaireName: "cp-ecog",
  instrumentName: "CP-ECOG",
  title: "CP-ECOG",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/cp-ecog",
  scoringQuestionId: "cp-ecog-total-score",
  maximumScore: 48,
  questionLinkIds: [
    "/89286-9/89146-5",
    "/89286-9/89149-9",
    "/89287-7/89172-1",
    "/89287-7/89138-2",
    "/89288-5/89154-9",
    "/89288-5/89165-5",
    "/89289-3/89143-2",
    "/89289-3/89140-8",
    "/89290-1/89158-0",
    "/89290-1/89173-9",
    "/89285-1/89141-6",
    "/89285-1/89171-3",
  ],
  chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 48, xLabel: "" },
};
