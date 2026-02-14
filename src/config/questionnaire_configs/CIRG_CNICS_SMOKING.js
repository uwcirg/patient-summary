import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS Smoking",
  title: "Nicotine Use",
  questionnaireMatchMode: "fuzzy",
  excludeQuestionLinkIdPatterns: ["summary"],
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    let arrMeaning = [];
    const tobaccoUseResponse = responses.find((response) =>
      linkIdEquals(response.id, "Smoking-Tobacco-Cigs-Summary", "strict"),
    );
    const eCigUseResponse = responses.find((response) => linkIdEquals(response.id, "E-Cigarettes-Summary", "strict"));
    const tobaccoUseAnswer =
      tobaccoUseResponse?.answer != null && tobaccoUseResponse.answer !== undefined ? tobaccoUseResponse.answer : null;
    const eCigUseAnswer =
      eCigUseResponse?.answer != null && eCigUseResponse.answer !== undefined ? eCigUseResponse.answer : null;
    if (tobaccoUseAnswer) arrMeaning.push("Tobacco cigarettes: " + tobaccoUseAnswer);
    if (eCigUseAnswer) arrMeaning.push("E-Cigarettes: " + eCigUseAnswer);
    return arrMeaning.join("|");
  },
  meaningRowLabel: "Summary",
};
