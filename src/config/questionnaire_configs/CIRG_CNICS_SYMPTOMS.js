import { MEANING_ONLY } from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "CNICS Symptoms Checklist",
  title: "Current Symptoms",
  subtitle: "From {date} assessment",
  questionnaireMatchMode: "fuzzy",
  meaningRowLabel: "Summary",
  disableHeaderRowSubtitle: true,
  columns: [
    { linkId: "Symptoms-bothers-a-lot", id: "bothersALot" },
    { linkId: "Symptoms-bothers-some", id: "bothersSome" },
  ],
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const arrMeaning = [];
    const bothersALotResponse = responses.find((response) =>
      linkIdEquals(response.id, "Symptoms-bothers-a-lot", "strict"),
    );
    const bothersALotAnswer =
      bothersALotResponse?.answer != null && bothersALotResponse.answer !== undefined
        ? bothersALotResponse.answer
        : null;
    const bothersSomeResponse = responses.find((response) =>
      linkIdEquals(response.id, "Symptoms-bothers-some", "strict"),
    );
    const bothersSomeAnswer =
      bothersSomeResponse?.answer != null && bothersSomeResponse.answer !== undefined
        ? bothersSomeResponse.answer
        : null;
    if (bothersALotAnswer) arrMeaning.push("Bothers a lot: " + bothersALotAnswer);
    if (bothersSomeAnswer) arrMeaning.push("Bothers some: " + bothersSomeAnswer);
    return arrMeaning.join("|");
  },
};
