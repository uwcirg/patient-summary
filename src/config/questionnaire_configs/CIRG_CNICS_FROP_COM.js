import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "Falls Risk for Older People in the Community (FROP-Com)",
  title: "Falls",
  subtitle: "Past 12 months",
  questionnaireMatchMode: "fuzzy",
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    let arrMeaning = [];
    const fallResponse = responses.find((response) => linkIdEquals(response.id, "FROP-Com-0", "strict"));
    const numFalls = fallResponse?.answer != null && fallResponse.answer !== undefined ? fallResponse.answer : null;
    if (numFalls !== null) {
      arrMeaning.push(`Number of falls: ${numFalls.replace(/\bfalls?\b/g, "").trim()}`);
    }
    const edVisitResponse = responses.find((response) => linkIdEquals(response.id, "FROP-Com-1", "strict"));
    const edVisit =
      edVisitResponse?.answer != null && edVisitResponse.answer !== undefined ? edVisitResponse.answer : null;
    if (edVisit !== null) {
      arrMeaning.push(`E/D visit: ${edVisit}`);
    }
    return arrMeaning.join("|");
  },
  skipMeaningScoreRow: true,
};
