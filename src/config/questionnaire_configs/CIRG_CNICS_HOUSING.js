import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS Housing Measure",
  title: "Housing",
  subtitle: "Past month",
  questionnaireMatchMode: "fuzzy",
  meaningQuestionId: "HOUSING-1",
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const housingResponse = responses.find((response) => linkIdEquals(response.id, "HOUSING-1", "strict"));
    const housingAnswer =
      housingResponse?.answer != null && housingResponse.answer !== undefined ? housingResponse.answer : null;
    return housingAnswer;
  },
  skipMeaningScoreRow: true,
};
