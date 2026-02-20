import { isEmptyArray, isNil } from "@util";
import { linkIdEquals } from "@util/fhirUtil";
import CHART_CONFIG from "./chart_config";

/**
 * Base defaults inherited by every questionnaire config.
 * Individual configs spread this first, then override as needed.
 */
export const BASE_CONFIG = {
  questionnaireMatchMode: "fuzzy",
  linkIdMatchMode: "strict",
  skipChart: false,
  skipResponses: false,
  displayMeaningNotScore: false,
  disableHeaderRowSubtitle: false,
  skipMeaningScoreRow: false,
  chartParams: { ...CHART_CONFIG.default, xLabel: "" },
};

/**
 * Configs that derive a single item from a host questionnaire
 * Typically skip chart and meaning row.
 */
export const DERIVED_SINGLE_ITEM = {
  ...BASE_CONFIG,
  skipMeaningScoreRow: true,
  skipChart: true,
};

/**
 * Configs that display meaning text (not a numeric score) with no chart.
 */
export const MEANING_ONLY = {
  ...BASE_CONFIG,
  displayMeaningNotScore: true,
  skipChart: true,
};

/**
 * Shared Yes/No fallbackMeaningFunc helper function for boolean responses.
 * @param {string} linkId - The linkId to search for in responses
 * @returns {Function} A fallbackMeaningFunc
 */
export function makeBooleanMeaningFunc(linkId) {
  return function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    const r = responses.find((response) => linkIdEquals(response.id, linkId, "strict"));
    const answer = r?.answer != null && r.answer !== undefined ? r.answer : null;
    if (String(answer).toLowerCase() === "true") return "Yes";
    if (String(answer).toLowerCase() === "false") return "No";
    return answer;
  };
}

/**
 * Shared Yes/No value formatter for boolean values.
 */
export const booleanValueFormatter = (val) =>
  String(val).toLowerCase() === "true" ? "Yes" : String(val).toLowerCase() === "false" ? "No" : val;

/**
 * Shared percentage value formatter.
 */
export const percentValueFormatter = (value) =>
  !isNil(value) ? `${value} ${String(value).includes("%") ? "" : "%"}` : value;

/**
 * Configs derived from CIRG-CNICS-SEXUAL-RISK that show Yes/No boolean results.
 */
export const SEXUAL_RISK_DERIVED = {
  ...MEANING_ONLY,
  skipResponses: true,
  valueFormatter: booleanValueFormatter,
};

/**
 * Helper to build a sexual risk derived config
 * @param {string} linkId - The SEXUAL-RISK-SCORE-* linkId
 * @param {string} title - Display title
 * @param {string} meaningRowLabel - Label for the meaning row
 */
export function makeSexualRiskDerivedConfig(linkId, title, meaningRowLabel) {
  return {
    ...SEXUAL_RISK_DERIVED,
    instrumentName: "Unprotected Sex",
    title,
    subtitle: "Past 3 months",
    deriveFrom: {
      hostIds: ["CIRG-CNICS-SEXUAL-RISK"],
      linkId,
    },
    columns: [{ linkId, id: "result" }],
    fallbackMeaningFunc: makeBooleanMeaningFunc(linkId),
    meaningRowLabel,
  };
}

/**
 * Configs derived from CIRG-CNICS-ARV.
 */
export const ARV_DERIVED = {
  ...DERIVED_SINGLE_ITEM,
};

/**
 * Helper to build an ARV-derived config.
 * @param {string} linkId - The ARV-* linkId
 * @param {string} title - Display title
 * @param {string} instrumentName - Instrument name
 * @param {object} [extra] - Additional overrides
 */
export function makeArvDerivedConfig(linkId, title, instrumentName, extra = {}) {
  return {
    ...ARV_DERIVED,
    instrumentName,
    title,
    deriveFrom: {
      hostIds: ["CIRG-CNICS-ARV"],
      linkId,
    },
    columns: [{ linkId, id: "result" }],
    ...extra,
  };
}

/**
 * Configs derived from CIRG-CNICS-EUROQOL that display a single derived item.
 */
export const EUROQOL_DERIVED = {
  ...MEANING_ONLY,
  skipResponses: true,
};

/**
 * Helper to build a EUROQOL-derived config.
 * @param {string} linkId - The EUROQOL-SCORE-* or EUROQOL-* linkId
 * @param {string} title - Display title
 * @param {string} meaningRowLabel - Label for the meaning row
 * @param {object} [extra] - Additional overrides
 */
export function makeEuroqolDerivedConfig(linkId, title, meaningRowLabel, extra = {}) {
  return {
    ...EUROQOL_DERIVED,
    instrumentName: title,
    title,
    deriveFrom: {
      hostIds: ["CIRG-CNICS-EUROQOL"],
      linkId,
    },
    meaningQuestionId: linkId,
    meaningRowLabel,
    ...extra,
  };
}
