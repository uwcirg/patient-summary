import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS Polysubstance Use",
  title: "Concurrent Drug Use",
  subtitle: "Past 3 months",
  questionnaireMatchMode: "strict",
  highSeverityScoreCutoff: 1,
  scoringQuestionId: "ASSIST-Polysub",
  fallbackScoreMap: {
    "assist-polysub-0": 1,
    "assist-polysub-1": 0,
  },
  severityBands: [
    { min: 1, label: "high", meaning: "Yes, concurrent drug use" },
    { min: 0, label: "low", meaning: "No, no concurrent drug use" },
  ],
  meaningRowLabel: "Summary",
};
