import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  questionnaireId: "CIRG-PC-PTSD-5",
  questionnaireName: "CIRG-PC-PTSD-5",
  instrumentName: "The Primary Care PTSD Screen for DSM-5 [PC-PTSD-5]",
  title: "PTSD Symptoms",
  subtitle: "Past month",
  meaningQuestionId: "PC-PTSD-5-SCORE-SYMPTOMS",
  excludeQuestionLinkIdPatterns: ["102017-1"],
  questionnaireMatchMode: "fuzzy",
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const meaningResponse = responses.find((response) =>
      linkIdEquals(response.id, "PC-PTSD-5-SCORE-SYMPTOMS", "strict"),
    );
    const meaningAnswer =
      meaningResponse?.answer != null && meaningResponse.answer !== undefined ? meaningResponse.answer : null;
    return meaningAnswer?.split(",").join("|");
  },
  meaningRowLabel: "Summary (Symptoms endorsed in the past month)",
  disableHeaderRowSubtitle: true,
};
