import { MEANING_ONLY, makeBooleanMeaningFunc } from "@config/questionnaire_config_helpers";
export default {
  ...MEANING_ONLY,
  insturmentName: "Exchange Sex", // NOTE: typo preserved from original ("insturmentName")
  title: "Exchange Sex",
  subtitle: "Past 3 months",
  columns: [{ linkId: "EXCHANGE-SEX-SCORE-PAST-3-MONTHS", id: "result" }],
  fallbackMeaningFunc: makeBooleanMeaningFunc("EXCHANGE-SEX-SCORE-PAST-3-MONTHS"),
  meaningQuestionId: "EXCHANGE-SEX-SCORE-PAST-3-MONTHS",
  meaningRowLabel: "Exchange Sex (Past 3 months)",
  disableHeaderRowSubtitle: true,
};
