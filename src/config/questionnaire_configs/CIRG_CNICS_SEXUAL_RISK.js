import {
  booleanValueFormatter,
  DERIVED_SINGLE_ITEM,
  makeBooleanMeaningFunc,
  makeSexualRiskDerivedConfig,
  MEANING_ONLY,
  SEXUAL_RISK_DERIVED,
} from "@config/questionnaire_config_helpers";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...MEANING_ONLY,
  instrumentName: "Unprotected Sex",
  title: "Unprotected Sex",
  subtitle: "Past 3 months",
  columns: [{ linkId: "SEXUAL-RISK-SCORE-UNPROTECTED", id: "result" }],
  valueFormatter: booleanValueFormatter,
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const mainResponse = responses.find((response) =>
      linkIdEquals(response.id, "SEXUAL-RISK-SCORE-UNPROTECTED", "strict"),
    );
    const mainResponseAnswer =
      mainResponse?.answer != null && mainResponse.answer !== undefined ? mainResponse.answer : null;
    if (!mainResponseAnswer || String(mainResponseAnswer).toLowerCase() !== "yes") return mainResponseAnswer;

    let arrResponses = [mainResponseAnswer];

    const sexTypes = [
      { linkId: "SEXUAL-RISK-SCORE-UNPROTECTED-ANAL", label: "Anal Sex" },
      { linkId: "SEXUAL-RISK-SCORE-UNPROTECTED-ORAL", label: "Oral Sex" },
      { linkId: "SEXUAL-RISK-SCORE-UNPROTECTED-VAGINAL", label: "Vaginal Sex" },
    ];

    for (const { linkId, label } of sexTypes) {
      const resp = responses.find((response) => linkIdEquals(response.id, linkId, "strict"));
      const answer = resp?.answer != null && resp.answer !== undefined ? resp.answer : null;
      if (String(answer).toLowerCase() === "true") arrResponses.push(`${label}: Yes`);
      else if (String(answer).toLowerCase() === "false") arrResponses.push(`${label}: No`);
      else arrResponses.push(`${label}: ${answer ? answer : "-"}`);
    }

    return arrResponses.join("|");
  },
  skipResponses: true,
  meaningRowLabel: "Unprotected Sex (Past 3 months)",
};

export const CIRG_SEXUAL_PARTNER_CONTEXT = {
  ...MEANING_ONLY,
  instrumentName: "Sexual Partner Context",
  title: "Sexual Partner Context",
  subtitle: "Past 3 months",
  skipResponses: true,
  deriveFrom: {
    hostIds: ["CIRG-CNICS-SEXUAL-RISK"],
    linkIds: [
      "SEXUAL-RISK-SCORE-PARTNERS-GENDERS",
      "SEXUAL-RISK-SCORE-PARTNERS-HIV-NEG-PREP",
      "SEXUAL-RISK-SCORE-PARTNERS-HIV-UNKNOWN",
    ],
  },
  columns: [
    { linkId: "SEXUAL-RISK-SCORE-PARTNERS-GENDERS", id: "result" },
    { linkId: "SEXUAL-RISK-SCORE-PARTNERS-HIV-NEG-PREP", id: "result" },
    { linkId: "SEXUAL-RISK-SCORE-PARTNERS-HIV-UNKNOWN", id: "result" },
  ],
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const fields = [
      "SEXUAL-RISK-SCORE-PARTNERS-GENDERS",
      "SEXUAL-RISK-SCORE-PARTNERS-HIV-NEG-PREP",
      "SEXUAL-RISK-SCORE-PARTNERS-HIV-UNKNOWN",
    ];
    return fields
      .map((linkId) => {
        const resp = responses.find((response) => linkIdEquals(response.id, linkId, "strict"));
        const answer = resp?.answer != null && resp.answer !== undefined ? resp.answer : null;
        return answer && String(answer).toLowerCase() !== "tbd" ? answer : null;
      })
      .filter(Boolean)
      .join("|");
  },
  meaningRowLabel: "Sexual Partner Context (Past 3 months)",
};

export const CIRG_SEXUAL_PARTNERS = {
  ...DERIVED_SINGLE_ITEM,
  instrumentName: "Number of Sexual Partners",
  title: "# of Sex Partners",
  subtitle: "Past 3 months",
  deriveFrom: {
    hostIds: ["CIRG-CNICS-SEXUAL-RISK"],
    linkId: "SEXUAL-RISK-SCORE-NUM-PARTNERS",
  },
  columns: [{ linkId: "SEXUAL-RISK-SCORE-NUM-PARTNERS", id: "result" }],
};

export const CIRG_STI = {
  ...SEXUAL_RISK_DERIVED,
  instrumentName: "STI",
  title: "Concern for STI Exposure",
  subtitle: "Past 3 months",
  deriveFrom: {
    hostIds: ["CIRG-CNICS-SEXUAL-RISK"],
    linkId: "SEXUAL-RISK-SCORE-STI-EXPOSURE",
  },
  columns: [{ linkId: "SEXUAL-RISK-SCORE-STI-EXPOSURE", id: "result" }],
  valueFormatter: (val) =>
    String(val).toLowerCase() === "true" ? "Yes" : String(val).toLowerCase() === "false" ? "No" : "",
  fallbackMeaningFunc: makeBooleanMeaningFunc("SEXUAL-RISK-SCORE-STI-EXPOSURE"),
  meaningRowLabel: "Concern for STI Exposure (Last 3 months)",
  alertQuestionId: "SEXUAL-RISK-SCORE-STI-EXPOSURE",
};

export const CIRG_UNPROTECTED_ANAL_SEX = makeSexualRiskDerivedConfig(
  "SEXUAL-RISK-SCORE-UNPROTECTED-ANAL",
  "Unprotected Anal Sex",
  "Unprotected Anal Sex",
);

export const CIRG_UNPROTECTED_ORAL_SEX = makeSexualRiskDerivedConfig(
  "SEXUAL-RISK-SCORE-UNPROTECTED-ORAL",
  "Unprotected Oral Sex",
  "Unprotected Oral Sex",
);

export const CIRG_UNPROTECTED_VAGINAL_SEX = makeSexualRiskDerivedConfig(
  "SEXUAL-RISK-SCORE-UNPROTECTED-VAGINAL",
  "Unprotected Vaginal Sex",
  "Unprotected Vaginal Sex",
);
