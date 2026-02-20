import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { capitalizeFirstLetterSafe, isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "Social Support",
  title: "Social Support",
  meaningRowLabel: "Summary",
  alertQuestionId: "MAPSS-SF-SCORE-CRITICAL",
  meaningQuestionId: "MAPSS-SF-SCORE-SOCIAL-SUPPORT",
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const meaningResponse = responses.find((response) =>
      linkIdEquals(response.id, "MAPSS-SF-SCORE-SOCIAL-SUPPORT", "strict"),
    );
    const meaningAnswer =
      meaningResponse?.answer != null && meaningResponse.answer !== undefined ? meaningResponse.answer : null;
    return meaningAnswer ? capitalizeFirstLetterSafe(String(meaningAnswer)) : "";
  },
};
