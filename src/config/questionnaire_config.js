import { isEmptyArray } from "@util";
import { getResourcesByResourceType, linkIdEquals } from "@util/fhirUtil";
import CIRG_ADL_IADL from "./questionnaire_configs/CIRG_ADL_IADL";
import CIRG_BEHAV5 from "./questionnaire_configs/CIRG_BEHAV5";
import CIRG_C_IDAS from "./questionnaire_configs/CIRG_C_IDAS";
import CIRG_CNICS_ARV, {
  CIRG_CNICS_ARV_MISSED_DOSE,
  CIRG_CNICS_ARV_SRS,
  CIRG_CNICS_ARV_VAS,
} from "./questionnaire_configs/CIRG_CNICS_ARV";
import CIRG_CNICS_ASSIST from "./questionnaire_configs/CIRG_CNICS_ASSIST";
import CIRG_CNICS_ASSIS_OD from "./questionnaire_configs/CIRG_CNICS_ASSIS_OD";
import CIRG_CNICS_ASSIST_POLYSUB from "./questionnaire_configs/CIRG_CNICS_ASSIST_POLYSUB";
import CIRG_CNICS_AUDIT from "./questionnaire_configs/CIRG_CNICS_AUDIT";
import CIRG_CNICS_EUROQOL, {
  CIRG_CNICS_EUROQOL_ANXIETY_DEPRESSION,
  CIRG_CNICS_EUROQOL_EUROQOL_5,
  CIRG_CNICS_EUROQOL_PAIN_DISCOMFORT,
  CIRG_CNICS_EUROQOL_SELF_CARE,
  CIRG_CNICS_EUROQOL_USUAL_ACTIVITIES,
} from "./questionnaire_configs/CIRG_CNICS_EUROQOL";
import CIRG_CNICS_EXCHANGE_SEX from "./questionnaire_configs/CIRG_CNICS_EXCHANGE_SEX";
import CIRG_CNICS_FINANCIAL from "./questionnaire_configs/CIRG_CNICS_FINANCIAL";
import CIRG_CNICS_FOOD from "./questionnaire_configs/CIRG_CNICS_FOOD";
import CIRG_CNICS_FROP_COM from "./questionnaire_configs/CIRG_CNICS_FROP_COM";
import CIRG_CNICS_HIV_STIGMA from "./questionnaire_configs/CIRG_CNICS_HIV_STIGMA";
import CIRG_CNICS_HOUSING from "./questionnaire_configs/CIRG_CNICS_HOUSING";
import CIRG_CNICS_IPV4 from "./questionnaire_configs/CIRG_CNICS_IPV4";
import CIRG_CNICS_MAPSS_SF from "./questionnaire_configs/CIRG_CNICS_MAPSS_SF";
import CIRG_CNICS_MINI from "./questionnaire_configs/CIRG_CNICS_MINI";
import CIRG_CNICS_SEXUAL_RISK, {
  CIRG_SEXUAL_PARTNER_CONTEXT,
  CIRG_SEXUAL_PARTNERS,
  CIRG_STI,
  CIRG_UNPROTECTED_ANAL_SEX,
  CIRG_UNPROTECTED_ORAL_SEX,
  CIRG_UNPROTECTED_VAGINAL_SEX,
} from "./questionnaire_configs/CIRG_CNICS_SEXUAL_RISK";
import CIRG_CNICS_SMOKING from "./questionnaire_configs/CIRG_CNICS_SMOKING";
import CIRG_CNICS_SYMPTOMS from "./questionnaire_configs/CIRG_CNICS_SYMPTOMS";
import CIRG_CP_ECOG from "./questionnaire_configs/CIRG_CP_ECOG";
import CIRG_ECOG12 from "./questionnaire_configs/CIRG_ECOG12";
import CIRG_GAD7 from "./questionnaire_configs/CIRG_GAD7";
import CIRG_GDS from "./questionnaire_configs/CIRG_GDS";
import CIRG_MINICOG from "./questionnaire_configs/CIRG_MINICOG";
import CIRG_PC_PTSD_5 from "./questionnaire_configs/CIRG_PC_PTSD_5";
import CIRG_PHQ9, { CIRG_SI } from "./questionnaire_configs/CIRG_PHQ9";
import CIRG_SLUMS from "./questionnaire_configs/CIRG_SLUMS";
import QuestionnaireScoringBuilder from "@/models/resultBuilders/QuestionnaireScoringBuilder";

function normalizeInstrumentConfigKeys(config) {
  if (!config || typeof config !== "object") return config;

  const questionLinkIds =
    config.questionLinkIds ??
    config.questionLInkIds ?? // typo support
    [];

  return {
    ...config,
    questionLinkIds: Array.isArray(questionLinkIds) ? questionLinkIds : [questionLinkIds],
  };
}

function deriveCutoffsFromBands(config, { highLabel = "high", mediumLabel = "moderate" } = {}) {
  const bands = config?.severityBands;
  if (isEmptyArray(bands)) return config;

  const minForLabel = (label) => bands.find((b) => b?.label === label)?.min;

  return {
    ...config,
    highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? minForLabel(highLabel),
    mediumSeverityScoreCutoff: config.mediumSeverityScoreCutoff ?? minForLabel(mediumLabel),
  };
}

function assertCutoffsMatchBands(
  config,
  { highLabel = "high", mediumLabel = "moderate", strict = true, epsilon = 0 } = {},
) {
  const bands = config?.severityBands;
  if (isEmptyArray(bands)) return;
  if (config?.comparisonToAlert === "lower") return; // TODO add assert for this type of comparison, see MINICOG

  const minForLabel = (label) => bands.find((b) => b?.label === label)?.min;
  const problems = [];

  const highMin = minForLabel(highLabel);
  if (highMin != null && config?.highSeverityScoreCutoff != null) {
    if (Math.abs(config.highSeverityScoreCutoff - highMin) > epsilon) {
      problems.push(`highSeverityScoreCutoff (${config.highSeverityScoreCutoff}) != "${highLabel}" min (${highMin})`);
    }
  }

  const mediumMin = minForLabel(mediumLabel);
  if (mediumMin != null && config?.mediumSeverityScoreCutoff != null) {
    if (Math.abs(config.mediumSeverityScoreCutoff - mediumMin) > epsilon) {
      problems.push(
        `mediumSeverityScoreCutoff (${config.mediumSeverityScoreCutoff}) != "${mediumLabel}" min (${mediumMin})`,
      );
    }
  }

  if (problems.length) {
    const msg = `[${config?.key ?? "instrument"}] cutoff mismatch:\n- ${problems.join("\n- ")}`;
    if (strict) throw new Error(msg);
    console.warn(msg, config);
  }
}

function assertDisplayMeaningNotScoreHasMeaningSource(config, { strict = false } = {}) {
  if (!config?.displayMeaningNotScore) return;

  const hasMeaningQuestionId =
    typeof config?.meaningQuestionId === "string" && config.meaningQuestionId.trim().length > 0;
  const hasFallbackMeaningFunc = typeof config?.fallbackMeaningFunc === "function";
  const hasScoringQuestionId =
    typeof config?.scoringQuestionId === "string" && config.scoringQuestionId.trim().length > 0;

  if (!(hasMeaningQuestionId || hasScoringQuestionId) && !hasFallbackMeaningFunc) {
    const msg =
      `[${config?.key ?? "instrument"}] displayMeaningNotScore is true, but neither meaningQuestionId nor fallbackMeaningFunc is specified. ` +
      `At least one must be provided to determine what meaning to display.`;
    if (strict) throw new Error(msg);
    console.warn(msg, config);
  }
}

function bootstrapInstrumentConfig(config) {
  let out = normalizeInstrumentConfigKeys(config);
  out = deriveCutoffsFromBands(out);

  // validate once (dev only)
  const envDefined = typeof import.meta.env !== "undefined" && import.meta.env;
  // enviroment variables as defined in Node
  if (envDefined && import.meta.env["NODE_ENV"] !== "production") {
    assertCutoffsMatchBands(out, { strict: true });
    assertDeriveFromConfigIsConsistent(out, {
      strict: true,
      allowQuestionLinkIdsSameAsDerived: true, // set to false if never want questionLinkIds present when deriveFrom is set (even if it equals the derived linkId)
    });
    warnIfScoringIdsAreInQuestionLinkIds(out); // warn only
    assertDisplayMeaningNotScoreHasMeaningSource(out); // warn only
  }
  return out;
}

function assertDeriveFromConfigIsConsistent(config, { strict = true, allowQuestionLinkIdsSameAsDerived = true } = {}) {
  const derive = config?.deriveFrom;
  if (!derive) return;

  const hasHostIds = Array.isArray(derive.hostIds) && derive.hostIds.length > 0;
  const hasLinkId = typeof derive.linkId === "string" && derive.linkId.trim().length > 0;

  // only validate when deriveFrom is actually configured
  if (!hasHostIds && !hasLinkId) return;

  // 1) questionLinkIds should not be used with deriveFrom (or it will be ignored)
  const qids = config?.questionLinkIds;
  if (!isEmptyArray(qids)) {
    const ok =
      allowQuestionLinkIdsSameAsDerived &&
      qids.length === 1 &&
      hasLinkId &&
      linkIdEquals(String(qids[0]), String(derive.linkId), config?.linkIdMatchMode ?? "fuzzy");

    if (!ok) {
      const msg =
        `[${config?.key ?? "instrument"}] deriveFrom is set (hostIds/linkId), so questionLinkIds must be omitted/empty ` +
        `(or it will be ignored). Found questionLinkIds=${JSON.stringify(qids)} deriveFrom.linkId=${JSON.stringify(
          derive.linkId,
        )}`;
      if (strict) throw new Error(msg);
      console.warn(msg, config);
    }
  }

  // 2) scoringQuestionId should match deriveFrom.linkId (if both specified)
  if (hasLinkId) {
    const scoringId = config?.scoringQuestionId;
    if (!scoringId) return;
    if (typeof scoringId === "string" && scoringId.trim().length > 0) {
      const matches = linkIdEquals(String(scoringId), String(derive.linkId), config?.linkIdMatchMode ?? "fuzzy");
      if (!matches) {
        const msg =
          `[${config?.key ?? "instrument"}] scoringQuestionId must match deriveFrom.linkId for derived instruments. ` +
          `scoringQuestionId=${JSON.stringify(scoringId)} deriveFrom.linkId=${JSON.stringify(derive.linkId)}`;
        if (strict) throw new Error(msg);
        console.warn(msg, config);
      }
    } else {
      // If want to require scoringQuestionId whenever deriveFrom.linkId exists, enforce it here:
      const msg =
        `[${config?.key ?? "instrument"}] deriveFrom.linkId is set, but scoringQuestionId is missing. ` +
        `Set scoringQuestionId to deriveFrom.linkId (${JSON.stringify(derive.linkId)}).`;
      if (strict) throw new Error(msg);
      console.warn(msg, config);
    }
  }
}

function warnIfScoringIdsAreInQuestionLinkIds(config) {
  const qids = Array.isArray(config?.questionLinkIds) ? config.questionLinkIds : [];
  if (qids.length === 0) return;

  const mode = config?.linkIdMatchMode ?? "fuzzy";

  const scoringId = typeof config?.scoringQuestionId === "string" ? config.scoringQuestionId : null;
  const subIds = Array.isArray(config?.subScoringQuestions) ? config.subScoringQuestions.map((o) => o.linkId) : [];

  const contained = [];

  if (scoringId) {
    const found = qids.find((qid) => linkIdEquals(String(qid), String(scoringId), mode));
    if (found) contained.push({ type: "scoringQuestionId", id: scoringId, matched: found });
  }

  for (const sid of subIds) {
    if (!sid) continue;
    const found = qids.find((qid) => linkIdEquals(String(qid), String(sid), mode));
    if (found) contained.push({ type: "subScoringQuestionIds", id: sid, matched: found });
  }

  if (contained.length) {
    console.warn(
      `[${config?.key ?? "instrument"}] questionLinkIds contains scoring id(s). ` +
        `This can cause confusion or double counting. ` +
        `Consider removing these from questionLinkIds.`,
      { contained, questionLinkIds: qids },
    );
  }
}

function bootstrapInstrumentConfigMap(map) {
  const out = {};
  for (const [key, cfg] of Object.entries(map ?? {})) {
    out[key] = bootstrapInstrumentConfig({ key, ...cfg });
  }
  return out;
}

/**
 * @param {string} [alertQuestionId] linkId of question that contains alert/critical flag
 * @param {Object|Array} [chartParam] params for charting line/bar graphs
 * @param {string} [clockLinkId] for Mini-Cog: linkId for clock drawing item
 * @param {Object} [clockScoreMap] for Mini-Cog: map of clock drawing answer to score
 * @param {Object[]} [columns] additional columns to extract from responses
 * @param {boolean} [comparisonToAlert] 'higher' (default) means higher scores are worse; 'lower' means lower scores are worse
 * @param {boolean} [disableHeaderRowSubtitle] if true the subtitle won't display in the header row in responses table
 * @param {Object} [deriveFrom] configuration for deriving score from other questionnaire(s)
 * @param {string[]} [deriveFrom.hostIds] questionnaire keys/ids to derive from
 * @param {string} [deriveFrom.linkId] linkId of the question in the host questionnaire(s) to derive from
 * @param {string[]} [deriveFrom.linkIds] [linkIds] of the questions in the host questionnaire(s) to derive from
 * @param {boolean} [deriveFrom.usePreviousScore] if true, use previous score from host questionnaire(s) instead of current score
 * @param {boolean} [displayMeaningNotScore] if true, display meaning/label instead of numeric score
 * @param {array} [excludeQuestionLinkIdPatterns] param for pattern in link Id to exclude as a response item
 * @param {function} [fallbackMeaningFunc] function to derive meaning from severity and responses
 * @param {Object} [fallbackScoreMap] map of linkId to score
 * @param {number} [highSeverityScoreCutoff] score cutoff for high severity
 * @param {string} [instrumentName] name of the instrument
 * @param {string} [key] unique key for this instrument config
 * @param {string} [linkIdMatchMode] 'strict'|'fuzzy'
 * @param {number} [maximumScore] maximum possible score
 * @param {string} [meaningQuestionId] linkId of question that contains meaning/label for the score
 * @param {string} [meaningRowLabel] label for the meaning row in responses table
 * @param {number} [minimumScore] minimum possible score
 * @param {string} [note] information note about the instrument score, displayed with info icon
 * @param {function} [noteFunction] function that will return a text for the note about the instrument score, displayed with info icon
 * @param {boolean} [nullScoreAllowed] if true, a null score is allowed (not an error)
 * @param {string} [questionnaireId] key or id of the Questionnaire FHIR resource
 * @param {string} [questionnaireMatchMode] 'strict'|'fuzzy' - used when matching a Questionnaire FHIR resource to this config
 * @param {string} [questionnaireName] short name for the questionnaire
 * @param {string} [questionnaireUrl] URL for the questionnaire
 * @param {string[]} [questionLinkIds] optional, linkIds of questions to include, usually specified if linkId can be different for a question /1111 or 1111
 * @param {string} questionRowLabel label for the question row in responses table
 * @param {string[]} [recallCorrectCodes] for Mini-Cog: coded answers that count as correct for recall items
 * @param {string[]} [recallCorrectStrings] for Mini-Cog: string answers that count as correct for recall items
 * @param {string[]} [recallLinkIds] for Mini-Cog: linkIds for recall items
 * @param {string|null} [scoringQuestionId] linkId of the question used for scoring
 * @param {boolean} [showNumAnsweredWithScore] if true, show number of answered only when score is present
 * @param {{min:number,label:string,meaning?:string}[]} [severityBands]
 * @param {boolean} [skipChart] if true, do not render chart for this questionnaire
 * @param {boolean} [skipMeaningScoreRow] if true, the score/ meaning row in the responses table will not be rendered
 * @param {boolean} [skipResponses] if true, the response rows in the responses table will not be rendered
 * @param {Object} [subScores] map of sub-score configurations
 * @param {string[]} [subScoringQuestions] optional, object of sub-questions to include for scoring breakdowns
 * @param {string} [subtitle] subtitle to show under title in questionnaire header
 * @param {string} [title] (from Questionnaire resource)
 * @param {function} [tooltipValueFormatter] function to format y value in tooltip
 * @param {string} [totalAnsweredQuestionId] question Id for the number of answered questions
 * @param {function} [valueFormatter] function to format response value for display
 * @param {object[]} [yLineFields] additional line fields to show in chart
 */
const questionnaireConfigsRaw = {
  "CIRG-ADL-IADL": CIRG_ADL_IADL,
  "CIRG-BEHAV5": CIRG_BEHAV5,
  "CIRG-C-IDAS": CIRG_C_IDAS,
  "CIRG-CNICS-ARV": CIRG_CNICS_ARV,
  "CIRG-CNICS-ASSIST": CIRG_CNICS_ASSIST,
  "CIRG-CNICS-ASSIST-OD": CIRG_CNICS_ASSIS_OD,
  "CIRG-CNICS-ASSIST-Polysub": CIRG_CNICS_ASSIST_POLYSUB,
  "CIRG-CNICS-AUDIT": CIRG_CNICS_AUDIT,
  "CIRG-CNICS-EUROQOL": CIRG_CNICS_EUROQOL,
  "CIRG-CNICS-EUROQOL-ANXIETY-DEPRESSION": CIRG_CNICS_EUROQOL_ANXIETY_DEPRESSION,
  "CIRG-CNICS-EUROQOL-EUROQOL-5": CIRG_CNICS_EUROQOL_EUROQOL_5,
  "CIRG-CNICS-EUROQOL-PAIN-DISCOMFORT": CIRG_CNICS_EUROQOL_PAIN_DISCOMFORT,
  "CIRG-CNICS-EUROQOL-SELF-CARE": CIRG_CNICS_EUROQOL_SELF_CARE,
  "CIRG-CNICS-EUROQOL-USUAL-ACTIVITIES": CIRG_CNICS_EUROQOL_USUAL_ACTIVITIES,
  "CIRG-CNICS-EXCHANGE-SEX": CIRG_CNICS_EXCHANGE_SEX,
  "CIRG-CNICS-FINANCIAL": CIRG_CNICS_FINANCIAL,
  "CIRG-CNICS-FOOD": CIRG_CNICS_FOOD,
  "CIRG-CNICS-FROP-Com": CIRG_CNICS_FROP_COM,
  "CIRG-CNICS-HIV-STIGMA": CIRG_CNICS_HIV_STIGMA,
  "CIRG-CNICS-HOUSING": CIRG_CNICS_HOUSING,
  "CIRG-CNICS-IPV4": CIRG_CNICS_IPV4,
  "CIRG-CNICS-MAPSS-SF": CIRG_CNICS_MAPSS_SF,
  "CIRG-CNICS-MINI": CIRG_CNICS_MINI,
  "CIRG-CNICS-SEXUAL-RISK": CIRG_CNICS_SEXUAL_RISK,
  "CIRG-CNICS-Smoking": CIRG_CNICS_SMOKING,
  "CIRG-CNICS-Symptoms": CIRG_CNICS_SYMPTOMS,
  "CIRG-CONCURRENT-IDU": {
    instrumentName: "Concurrent IDU",
    title: "Concurrent IDU",
  },
  "CIRG-CP-ECOG": CIRG_CP_ECOG,
  "CIRG-ECOG12": CIRG_ECOG12,
  "CIRG-FENTANYL-STRIP-ACCESS": {
    instrumentName: "Fentanyl Test Strip Access",
    title: "Fentanyl Test Strip Access",
  },
  "CIRG-GAD7": CIRG_GAD7,
  "CIRG-GDS": CIRG_GDS,
  "CIRG-IDU": {
    instrumentName: "IDU",
    title: "IDU",
  },
  "CIRG-LAST-MISSED-DOSE": CIRG_CNICS_ARV_MISSED_DOSE,
  "CIRG-MINICOG": CIRG_MINICOG,
  "CIRG-NALOXONE-ACCESS": {
    instrumentName: "Naloxone Access",
    title: "Naloxone Access",
  },
  "CIRG-PARTNER-CONTEXT": CIRG_SEXUAL_PARTNER_CONTEXT,
  "CIRG-PC-PTSD-5": CIRG_PC_PTSD_5,
  "CIRG-PHQ9": CIRG_PHQ9,
  "CIRG-SEXUAL-PARTNERS": CIRG_SEXUAL_PARTNERS,
  "CIRG-SHORTNESS-OF-BREATH": {
    title: "Shortness of breath",
  },
  "CIRG-SI": CIRG_SI,
  "CIRG-SLUMS": CIRG_SLUMS,
  "CIRG-SRS": CIRG_CNICS_ARV_SRS,
  "CIRG-STI": CIRG_STI,
  "CIRG-UNPROTECTED-ANAL-SEX": CIRG_UNPROTECTED_ANAL_SEX,
  "CIRG-UNPROTECTED-ORAL-SEX": CIRG_UNPROTECTED_ORAL_SEX,
  "CIRG-UNPROTECTED-VAGINAL-SEX": CIRG_UNPROTECTED_VAGINAL_SEX,
  "CIRG-VAS": CIRG_CNICS_ARV_VAS,
};

export const getConfigForQuestionnaire = (id) => {
  return (
    questionnaireConfigs[String(id)] ||
    questionnaireConfigs[String(id).toUpperCase()] ||
    questionnaireConfigs[String(id).toLowerCase()] ||
    null
  );
};
export function findMatchingQuestionLinkIdFromCode(resource, linkIdList, config) {
  if (!resource) return null;
  if (!resource?.code?.coding) return null;
  if (isEmptyArray(linkIdList)) return null;

  for (const coding of resource.code.coding) {
    const match = linkIdList.find((id) =>
      linkIdEquals(String(id), String(coding.code), config?.linkIdMatchMode ?? "fuzzy"),
    );
    if (match) {
      return match;
    }
  }
  return null;
}
export function getProcessedQuestionnaireData(questionnaireId, opts = {}) {
  const { summaryData, bundle } = opts;
  if (summaryData && summaryData[questionnaireId]) return summaryData[questionnaireId];
  const config = summaryData?.questionnaireId?.config || getConfigForQuestionnaire(questionnaireId);
  if (!config) return null;
  const qb = new QuestionnaireScoringBuilder(config, bundle);
  const qrBundle = getResourcesByResourceType(bundle, "QuestionnaireResponse");
  const matchQs = [questionnaireId, config.deriveFrom?.hostIds ?? []].flat();
  const matchedQrs = qrBundle?.filter((item) => {
    const qId = item.questionnaire ? item.questionnaire?.split("/")[1] : null;
    return qId && matchQs.indexOf(qId) !== -1;
  });

  const processedSummaryData = !isEmptyArray(matchedQrs) ? qb._summariesByQuestionnaireRef(matchedQrs) : null;
  return processedSummaryData && processedSummaryData?.scoringSummaryData
    ? processedSummaryData
    : { ...config, config, scoringSummaryData: { ...config, hasData: false } };
}

const questionnaireConfigs = bootstrapInstrumentConfigMap(questionnaireConfigsRaw);
export default questionnaireConfigs;
