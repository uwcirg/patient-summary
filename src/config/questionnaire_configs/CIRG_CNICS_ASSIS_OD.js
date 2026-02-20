import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS ASSIST Overdose",
  title: "Overdose",
  subtitle: "Past 6 months",
  disableHeaderRowSubtitle: true,
  questionnaireMatchMode: "strict",
  highSeverityScoreCutoff: 1,
  comparisonToAlert: "higher",
  scoringQuestionId: "ASSIST-OD-recent",
  fallbackScoreMap: {
    "assist-od-recent-0": 0,
    "assist-od-recent-1": 1,
    "assist-od-recent-2": 2,
    "assist-od-recent-3": 3,
    "assist-od-recent-4": 4,
  },
  severityBands: [
    { min: 1, label: "high", meaning: "Yes, overdose" },
    { min: 0, label: "low", meaning: "No overdose" },
  ],
  meaningRowLabel: "Summary (Past 6 months)",
};
