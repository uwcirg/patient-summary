import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "IPV-4",
  title: "Concern for IPV",
  subtitle: "Past year",
  questionnaireMatchMode: "fuzzy",
  highSeverityScoreCutoff: 1,
  fallbackScoreMap: {
    "ipv4-1-0": 1,
    "ipv4-1-1": 0,
    "ipv4-2-0": 1,
    "ipv4-2-1": 0,
    "ipv4-3-0": 1,
    "ipv4-3-1": 0,
    "ipv4-4-0": 1,
    "ipv4-4-1": 0,
  },
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    if (!severity || severity === "low") return "";
    const answerMapping = {
      "IPV4-1": "Felt trapped",
      "IPV4-2": "Fearful of harm",
      "IPV4-3": "Sexual violence",
      "IPV4-4": "Physical violence",
    };
    const answers = responses
      .filter((response) => {
        return (
          (response.answer != null &&
            response.answer !== undefined &&
            linkIdEquals(response.linkId, "IPV4-1", "strict")) ||
          linkIdEquals(response.linkId, "IPV4-2", "strict") ||
          linkIdEquals(response.linkId, "IPV4-3", "strict") ||
          linkIdEquals(response.linkId, "IPV4-4", "strict")
        );
      })
      .map((response) => answerMapping[response.linkId]);
    return answers.join("|");
  },
  alertQuestionId: "IPV4-critical",
  meaningRowLabel: "Summary",
};
