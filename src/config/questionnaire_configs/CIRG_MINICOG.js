import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-MINICOG",
  questionnaireName: "MINICOG",
  instrumentName: "MINI-COG",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/minicog",
  recallLinkIds: ["/recall-1", "/recall-2", "/recall-3"],
  clockLinkId: "/clock",
  recallCorrectCodes: ["correct", "present", "Y"],
  recallCorrectStrings: ["correct", "present", "yes"],
  clockScoreMap: { normal: 2, abnormal: 0, 2: 2, 0: 0 },
  severityBands: [
    { min: 3, label: "low", meaning: "unlikely impairment" },
    { min: 0, label: "high", meaning: "possible impairment" },
  ],
  highSeverityScoreCutoff: 2,
  comparisonToAlert: "lower",
  chartParams: { ...CHART_CONFIG.default, dotColor: null },
};
