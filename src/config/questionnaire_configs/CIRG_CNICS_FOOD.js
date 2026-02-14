import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { capitalizeFirstLetterSafe, isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS Food Security Questionnaire",
  title: "Food Security",
  subtitle: "Past 12 months",
  questionnaireMatchMode: "fuzzy",
  scoringQuestionId: "FOOD-score",
  alertQuestionId: "FOOD-critical-flag",
  meaningQuestionId: "FOOD-score-label",
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const meaningResponse = responses.find((response) => linkIdEquals(response.id, "FOOD-score-label", "strict"));
    const meaningAnswer =
      meaningResponse?.answer != null && meaningResponse.answer !== undefined ? meaningResponse.answer : null;
    return meaningAnswer ? capitalizeFirstLetterSafe(String(meaningAnswer)) : "";
  },
};
