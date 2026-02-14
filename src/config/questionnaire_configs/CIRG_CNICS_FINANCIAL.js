import { MEANING_ONLY } from "@config/questionnaire_config_helpers";

export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS Financial Situation Questionnaire",
  title: "Financial Situation",
  questionnaireMatchMode: "fuzzy",
  highSeverityScoreCutoff: 1,
  comparisonToAlert: "higher",
  fallbackScoreMap: {
    "FINANCIAL-0-0": 1,
    "FINANCIAL-0-1": 0,
    "FINANCIAL-0-2": 0,
    "FINANCIAL-0-3": 0,
  },
  alertQuestionId: "FINANCIAL-critical-flag",
  meaningQuestionId: "FINANCIAL-score-label",
  skipResponses: true,
};
