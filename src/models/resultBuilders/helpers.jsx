import React from "react";
import dayjs from "dayjs";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import {
  conceptText,
  getDefaultQuestionItemText,
  getValidObservationsForQRs,
  getResourcesByResourceType,
  linkIdEquals,
  normalizeLinkId,
  makeQuestionItem,
} from "@util/fhirUtil";
import {
  generateUUID,
  getDisplayQTitle,
  getLocaleDateStringFromDate,
  isEmptyArray,
  isNil,
  isNumber,
  isPlainObject,
  normalizeStr,
  removeNullValuesFromObject,
  stripHtmlTags,
} from "@util";
import Scoring from "@components/Score";
import Meaning from "@components/Meaning";
import {
  DEFAULT_ANSWER_OPTIONS,
  CONDITION_CODES,
  EMPTY_CELL_STRING,
  IS_QUESTION_COLUMN_KEYWORDS,
  QUESTIONNAIRE_IDS,
  LINK_IDS,
  MINICOG_HIDDEN_IDS,
  SEVERITY_CUTOFFS,
  SCORING_PARAMS,
} from "@/consts";
import { CUT_OFF_TIMESTAMP_ON_GRAPH, getDateDomain } from "@/config/chart_config";
import questionnaireConfigs, {
  findMatchingQuestionLinkIdFromCode,
  getConfigForQuestionnaire,
  getProcessedQuestionnaireData,
} from "@/config/questionnaire_config";
import { report_config } from "@/config/report_config";

/* ---------------------------------------------
 * External helpers
 * Each helper receives a `ctx` (the builder instance)
 * so it can use cfg + utility methods without importing.
 * --------------------------------------------- */

/**
 * Summarizes SLUMS questionnaire responses with education-aware scoring
 *
 * @param {Object} ctx - Builder context containing utility methods and configuration
 * @param {Array<Object>} questionnaireResponses - Array of FHIR QuestionnaireResponse resources
 * @param {Object} questionnaire - FHIR Questionnaire resource definition
 * @param {Object} options - Optional configuration
 * @param {Array<Object>} [options.conditions] - Array of condition resources for education level detection
 * @returns {Array<Object>} Sorted array of processed response rows with scores and metadata
 */

export function summarizeSLUMHelper(ctx, questionnaireResponses, questionnaire, options = {}) {
  const conditions = options.conditions || getResourcesByResourceType(ctx.patientBundle);
  const hasLowerLevelEducation = !isEmptyArray(conditions)
    ? conditions.some((c) =>
        (c?.code?.coding || []).some(
          (cd) => (cd?.code || "").toString().toUpperCase() === CONDITION_CODES.LOWER_EDUCATION,
        ),
      )
    : false;

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);
    const stats = ctx.getScoreStatsFromQuestionnaireResponse(
      qr,
      questionnaire,
      questionnaireConfigs[QUESTIONNAIRE_IDS.SLUMS],
    );

    const { score, totalAnsweredItems, totalItems } = stats;

    const educationLevel = hasLowerLevelEducation ? "low" : "high";
    let scoreSeverity = "low";

    if (isNumber(score)) {
      const cutoff =
        educationLevel === "low" ? SEVERITY_CUTOFFS.SLUMS_LOW_EDUCATION : SEVERITY_CUTOFFS.SLUMS_HIGH_EDUCATION;

      if (score <= cutoff) {
        scoreSeverity = "high";
      }
    }

    let responses = ctx.formattedResponses(questionnaire?.item ?? null, flat);
    if (isEmptyArray(responses)) responses = ctx.responsesOnly(flat);

    return {
      ...getConfigForQuestionnaire(questionnaire?.id),
      id: qr.id,
      date: qr.authored ?? null,
      responses,
      ...stats,
      score,
      scoreSeverity,
      scoreMeaning: meaningFromSeverity(scoreSeverity),
      comparisonToAlert: "lower",
      scoringParams: { ...ctx.cfg, scoreSeverity: scoreSeverity },
      highSeverityScoreCutoff: hasLowerLevelEducation
        ? SEVERITY_CUTOFFS.SLUMS_LOW_EDUCATION
        : SEVERITY_CUTOFFS.SLUMS_HIGH_EDUCATION,
      totalAnsweredItems,
      totalItems,
      authoredDate: qr.authored,
      lastUpdated: qr.meta?.lastUpdated,
      educationLevel,
    };
  });

  return ctx.sortByNewestAuthoredOrUpdated(rows);
}

/**
 * Summarizes C-IDAS questionnaire responses with suicide risk flagging
 *
 * @param {Object} ctx - Builder context
 * @param {Array<Object>} questionnaireResponses - Array of QuestionnaireResponse resources
 * @param {Object} questionnaire - Questionnaire resource
 * @param {Object} options - Configuration options
 * @param {string} [options.suicideLinkId='cs-idas-15'] - Link ID for suicide question
 * @param {number} [options.maximumScore=36] - Maximum possible score
 * @param {number} [options.highSeverityScoreCutoff=19] - Cutoff for high severity
 * @returns {Array<Object>} Processed response rows with suicide risk indicators
 */
export function summarizeCIDASHelper(ctx, questionnaireResponses, questionnaire, options = {}) {
  // Item 7: Standardized parameter destructuring
  const {
    suicideLinkId = LINK_IDS.CIDAS_SUICIDE,
    maximumScore = SCORING_PARAMS.CIDAS_MAXIMUM_SCORE,
    highSeverityScoreCutoff = SEVERITY_CUTOFFS.CIDAS_HIGH_SEVERITY + 1,
  } = options;

  const coalesceNum = (n, fallback = 0) => (typeof n === "number" && Number.isFinite(n) ? n : fallback);

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);

    const { score, totalAnsweredItems, totalItems } = ctx.getScoreStatsFromQuestionnaireResponse(
      qr,
      questionnaire,
      questionnaireConfigs[QUESTIONNAIRE_IDS.CIDAS],
    );

    const suicideScore = coalesceNum(ctx.getScoringByResponseItem(questionnaire, flat, suicideLinkId), 0);

    // severity calculation
    const scoreSeverity =
      (isNumber(score) && score > SEVERITY_CUTOFFS.CIDAS_HIGH_SEVERITY) ||
      suicideScore >= SEVERITY_CUTOFFS.CIDAS_SUICIDE_THRESHOLD
        ? "high"
        : "low";

    const responses = ctx.formattedResponses(questionnaire?.item ?? [], flat);

    return {
      ...getConfigForQuestionnaire(questionnaire?.id),
      id: qr.id,
      instrumentName: "C-IDAS",
      date: qr.authored ?? null,
      responses,
      score,
      scoreSeverity,
      highSeverityScoreCutoff,
      meaning: meaningFromSeverity(scoreSeverity),
      alertNote: suicideScore >= SEVERITY_CUTOFFS.CIDAS_SUICIDE_THRESHOLD ? "suicide concern" : null,
      scoringParams: { ...ctx.cfg, maximumScore, scoreSeverity },
      totalAnsweredItems,
      totalItems,
      authoredDate: qr.authored,
      lastUpdated: qr.meta?.lastUpdated,
    };
  });

  return ctx.sortByNewestAuthoredOrUpdated(rows);
}

/**
 * Summarizes Mini-Cog questionnaire responses (recall + clock drawing test)
 *
 * Note: Clock score mapping - any score >= 1 is converted to 2 points per clinical protocol
 *
 * @param {Object} ctx - Builder context
 * @param {Array<Object>} questionnaireResponses - QuestionnaireResponse resources
 * @param {Object} questionnaire - Questionnaire resource
 * @param {Object} options - Configuration
 * @param {Array<string>} [options.recallLinkIds=['minicog-question1']] - Link IDs for recall questions
 * @param {string} [options.clockLinkId='minicog-question2'] - Link ID for clock drawing
 * @param {string} [options.totalLinkId='minicog-total-score'] - Link ID for total score
 * @param {number} [options.highSeverityScoreCutoff=3] - Cutoff for cognitive impairment
 * @returns {Array<Object>} Processed responses with recall, clock, and total scores
 */
export function summarizeMiniCogHelper(ctx, questionnaireResponses, questionnaire, options = {}) {
  const {
    recallLinkIds = [LINK_IDS.MINICOG_RECALL],
    clockLinkId = LINK_IDS.MINICOG_CLOCK,
    totalLinkId = LINK_IDS.MINICOG_TOTAL,
    highSeverityScoreCutoff = SEVERITY_CUTOFFS.MINICOG_HIGH_SEVERITY,
  } = options;

  const clamp = (n, lo, hi) => Math.min(Math.max(Number(n ?? 0), lo), hi);

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);

    // Recall score calculation
    let recallScore = null;
    if (recallLinkIds.length === 1) {
      const v = ctx.getScoringByResponseItem(questionnaire, flat, recallLinkIds[0]);
      recallScore = typeof v === "number" ? clamp(v, 0, SCORING_PARAMS.MINICOG_RECALL_MAX) : null;
    } else {
      const parts = recallLinkIds
        .map((id) => ctx.getScoringByResponseItem(questionnaire, flat, id))
        .map((x) => (typeof x === "number" ? x : 0));
      recallScore = clamp(
        parts.reduce((a, b) => a + b, 0),
        0,
        SCORING_PARAMS.MINICOG_RECALL_MAX,
      );
    }

    // Clock score (clinical protocol: >=1 converts to 2 points, else 0)
    const clockRaw = ctx.getScoringByResponseItem(questionnaire, flat, clockLinkId);
    const clockScore = typeof clockRaw === "number" ? (clockRaw >= 1 ? SCORING_PARAMS.MINICOG_CLOCK_SCORE : 0) : null;

    // Total score calculation
    const totalRaw = ctx.getScoringByResponseItem(questionnaire, flat, totalLinkId);
    const computed =
      typeof recallScore === "number" && typeof clockScore === "number" ? recallScore + clockScore : null;
    const totalScore =
      typeof totalRaw === "number"
        ? clamp(totalRaw, 0, SCORING_PARAMS.MINICOG_MAXIMUM_SCORE)
        : typeof computed === "number"
          ? clamp(computed, 0, SCORING_PARAMS.MINICOG_MAXIMUM_SCORE)
          : null;

    const scoreSeverity = severityFromScore(totalScore);

    let responses = ctx
      .formattedResponses(questionnaire?.item ?? [], flat)
      .filter((r) => !MINICOG_HIDDEN_IDS.has(r.id));

    if (isEmptyArray(responses)) responses = ctx.responsesOnly(flat);

    const totalItems = (ctx.getAnswerLinkIdsByQuestionnaire(questionnaire) || []).length;
    const totalAnsweredItems = flat.filter((it) => !linkIdEquals(it.linkId, totalLinkId)).length;

    return {
      ...getConfigForQuestionnaire(questionnaire?.id),
      id: qr.id,
      date: qr.authored ?? null,
      responses,
      scoresByLinkId: {
        [recallLinkIds[0]]: typeof recallScore === "number" ? recallScore : null,
        [clockLinkId]: typeof clockScore === "number" ? clockScore : null,
        [totalLinkId]: typeof totalScore === "number" ? totalScore : null,
      },
      word_recall_score: recallScore,
      clock_draw_score: clockScore,
      score: totalScore,
      scoreSeverity,
      meaning: meaningFromSeverity(scoreSeverity),
      comparisonToAlert: "lower",
      scoringParams: { ...(ctx.cfg ?? { maximumScore: SCORING_PARAMS.MINICOG_MAXIMUM_SCORE }), scoreSeverity },
      highSeverityScoreCutoff,
      totalAnsweredItems,
      totalItems,
      authoredDate: qr.authored,
      lastUpdated: qr.meta?.lastUpdated,
    };
  });

  return ctx.sortByNewestAuthoredOrUpdated(rows);
}

/* --------------------------- build questionnaire based on config/params --------------------------- */
export function buildQuestionnaire(resources = [], config = {}) {
  const qLinkIdList = config.questionLinkIds || [];

  const items = qLinkIdList.map((lid, idx) => {
    const opts = config.answerOptionsByLinkId?.[lid] ?? DEFAULT_ANSWER_OPTIONS;
    const match = resources.find((o) => findMatchingQuestionLinkIdFromCode(o, [lid], { linkIdMatchMode: "strict" }));
    const defaultQText = getDefaultQuestionItemText(lid, idx);
    const text = match ? conceptText(match) : (config.itemTextByLinkId?.[lid] ?? defaultQText);
    return makeQuestionItem(lid, text, opts);
  });

  // optional total score item (readOnly)
  const scoringQuestionId = getScoringLinkIdFromConfig(config);
  if (scoringQuestionId) {
    items.push({
      linkId: scoringQuestionId,
      type: "decimal",
      text: "Total score",
      readOnly: true,
      code: [{ system: "http://loinc.org", code: scoringQuestionId, display: "Total score" }],
    });
  }

  return {
    resourceType: "Questionnaire",
    id: config.questionnaireId ?? generateUUID(),
    url: config.questionnaireUrl,
    questionnaire: `Questionnaire/${config.questionnaireId}`,
    name: (config.questionnaireName || "").toUpperCase(),
    title: config.title ?? config.questionnaireName ?? "Questionnaire",
    status: "active",
    date: new Date().toISOString().slice(0, 10),
    item: items,
  };
}
export function getQuestionnaireResponseSkeleton(questionnaireID = "dummy101") {
  return {
    id: generateUUID(),
    resourceType: "QuestionnaireResponse",
    status: "completed",
    questionnaire: `Questionnaire/${questionnaireID}`,
  };
}

/* -------------------- Observations to QuestionnaireResponse -------------------- */
/**
 * Maps FHIR Observation value types to QuestionnaireResponse answer formats
 *
 * @param {Object} obs - FHIR Observation resource
 * @returns {Object|null} Answer object with appropriate value[x] field, or null if no recognized value
 */
export function defaultAnswerMapperFromObservation(obs) {
  if (!obs) return null;

  // Quantity → valueQuantity
  if (obs.valueQuantity) {
    const { value, unit, system, code, comparator } = obs.valueQuantity;
    const q = {};
    if (value !== undefined && value !== null) q.value = value;
    if (unit !== undefined) q.unit = unit;
    if (system !== undefined) q.system = system;
    if (code !== undefined) q.code = code;
    if (comparator !== undefined) q.comparator = comparator;
    return { valueQuantity: q };
  }

  // Integer / Decimal / Boolean
  if (obs.valueInteger !== undefined) return { valueInteger: obs.valueInteger };
  if (typeof obs.valueDecimal === "number") return { valueDecimal: obs.valueDecimal };
  if (typeof obs.valueBoolean === "boolean") return { valueBoolean: obs.valueBoolean };

  // Date/DateTime/Time
  if (obs.valueDateTime) return { valueDateTime: obs.valueDateTime };
  if (obs.valueDate) return { valueDate: obs.valueDate };
  if (obs.valueTime) return { valueTime: obs.valueTime };

  // CodeableConcept → valueCoding (pick first coding)
  if (!isEmptyArray(obs.valueCodeableConcept?.coding)) {
    const { system, code, display } = obs.valueCodeableConcept.coding[0];
    const coding = {};
    if (system !== undefined) coding.system = system;
    if (code !== undefined) coding.code = code;
    if (display !== undefined) coding.display = display;
    return { valueCoding: coding };
  }

  // String
  if (typeof obs.valueString === "string") return { valueString: obs.valueString };

  // Unrecognized value type
  if (obs.id) {
    console.warn(`defaultAnswerMapperFromObservation: Unrecognized value type for observation ${obs.id}`, obs);
  }

  return null;
}

/**
 * Validates and formats datetime string to minute precision
 *
 * @param {string} dtString - ISO datetime string
 * @returns {string} Formatted datetime (YYYY-MM-DDTHH:MM) or original if invalid
 */
function trimToMinutes(dtString) {
  // date validation
  if (!dtString) return dtString;
  const d = new Date(dtString);
  if (isNaN(d.getTime())) {
    console.warn(`trimToMinutes: Invalid date string "${dtString}"`);
    return dtString;
  }
  return d.toISOString().slice(0, 16);
}

/**
 * Generates a unique grouping key for observations
 * Falls back to UUID instead of "unknown" to prevent incorrect grouping
 *
 * @param {Object} observation - FHIR Observation resource
 * @returns {string} Unique grouping key
 */
function getObservationGroupingKey(observation) {
  return (
    observation.effectiveDateTime ||
    observation.issued ||
    observation.encounter?.reference ||
    `unknown-${generateUUID()}` // Prevent grouping unrelated observations
  );
}

/**
 * Converts a group of FHIR Observations to a single QuestionnaireResponse
 *
 * @param {Array<Object>} group - Array of related Observation resources
 * @param {Object} config - Configuration object
 * @param {Function} [config.getSubject] - Custom function to extract subject
 * @param {Function} [config.getAuthored] - Custom function to extract authored date
 * @param {Function} [config.getLinkId] - Custom function to determine linkId
 * @param {Array<string>} [config.questionLinkIds] - Expected question link IDs
 * @param {string} [config.questionnaireId] - Questionnaire ID reference
 * @returns {Object|null} FHIR QuestionnaireResponse or null if group is empty
 */
export function observationsToQuestionnaireResponse(group, config = {}) {
  if (isEmptyArray(group)) return null;

  const subject = config.getSubject?.(group) || group[0]?.subject || undefined;
  const extension = group[0].extension;
  const identifier = group[0].identifier;
  const authored =
    config.getAuthored?.(group) ||
    trimToMinutes(group[0]?.effectiveDateTime) ||
    trimToMinutes(group[0]?.issued) ||
    new Date().toISOString();

  const qLinkIdList = config?.questionLinkIds?.map((id) => normalizeLinkId(id));

  // Map answers
  const answersByLinkId = new Map();
  const textByLinkId = new Map();

  for (const obs of group) {
    let lid = normalizeLinkId(
      config.getLinkId
        ? config.getLinkId(obs, config)
        : (findMatchingQuestionLinkIdFromCode(obs, qLinkIdList, config) ?? obs.id),
    );
    if (!lid) continue;

    const ans = defaultAnswerMapperFromObservation(obs);
    if (!isNil(ans) && isPlainObject(ans)) answersByLinkId.set(lid, ans);
    textByLinkId.set(lid, conceptText(obs.code));
  }

  const answerLinkIdList = Array.from(answersByLinkId.keys());

  let qLinkIds = !isEmptyArray(answerLinkIdList) ? answerLinkIdList : qLinkIdList || [];
  const scoringQuestionId = getScoringLinkIdFromConfig(config);

  if (scoringQuestionId && !qLinkIds.find((qid) => normalizeLinkId(qid) === normalizeLinkId(scoringQuestionId))) {
    qLinkIds.push(normalizeLinkId(scoringQuestionId));
  }

  // Deduplicate after normalization
  const items = [...new Set(qLinkIds)].map((lid) => {
    const objAns = answersByLinkId.get(lid);
    const text = textByLinkId.get(lid);
    const item = {
      linkId: lid,
      text: text ? text : getDefaultQuestionItemText(normalizeLinkId(lid)),
    };
    if (!isNil(objAns)) {
      item.answer = Array.isArray(objAns) ? objAns : [objAns];
    }
    return item;
  });

  return {
    ...getQuestionnaireResponseSkeleton(config?.questionnaireId ?? config?.key),
    extension,
    identifier,
    subject,
    authored,
    item: items,
  };
}

/**
 * Converts multiple FHIR Observations to QuestionnaireResponses
 * Groups observations by effectiveDateTime/issued/encounter
 *
 * @param {Array<Object>} observationResources - Array of Observation resources
 * @param {Object} config - Configuration object
 * @returns {Array<Object>} Array of QuestionnaireResponse resources sorted by authored date
 */
export function observationsToQuestionnaireResponses(observationResources, config = {}) {
  if (isEmptyArray(observationResources)) return [];

  const observations = getValidObservationsForQRs(observationResources);

  /** Group observations using improved grouping key */
  const groupBy = (observations) => {
    const byGroup = new Map();
    for (const o of observations || []) {
      const key = getObservationGroupingKey(o);
      const group = byGroup.get(key);
      if (group) {
        group.push(o);
      } else {
        byGroup.set(key, [o]);
      }
    }
    return byGroup;
  };

  const groupByKey = groupBy(observations || []);
  const out = [];

  for (const [, group] of groupByKey.entries()) {
    const qr = observationsToQuestionnaireResponse(group, config);
    if (qr) out.push(qr);
  }

  return out.sort((a, b) => new Date(a.authored ?? 0) - new Date(b.authored ?? 0));
}

/**
 * Sorts response data by newest date first
 *
 * @param {Array<Object>} rdata - Array of response objects with date property
 * @returns {Array<Object>} Sorted copy of response array
 */
export function sortResponsesNewestFirst(rdata = []) {
  return [...rdata].sort((a, b) => {
    const dateA = a?.date ? new Date(a.date).getTime() : 0;
    const dateB = b?.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Gets the most recent response row from response data
 *
 * @param {Array<Object>} rdata - Response data array
 * @returns {Object|null} Most recent response or null if empty
 */
export function getMostRecentResponseRow(rdata = []) {
  return sortResponsesNewestFirst(rdata)[0] || null;
}

/**
 * Gets the previous response row that has a valid score
 * Skips responses with the same date as current
 *
 * @param {Array<Object>} rdata - Response data array
 * @returns {Object|null} Previous response with score or null if not found
 */
export function getPreviousResponseRowWithScore(rdata = []) {
  const rows = sortResponsesNewestFirst(rdata);
  if (isEmptyArray(rows) || rows.length < 2) return null;

  let prev = null;
  const currentItem = rows[0];

  for (let i = 1; i < rows.length; i++) {
    const item = rows[i];
    if (currentItem.date && currentItem.date === item.date) {
      continue;
    }
    if (isNumber(item?.score)) {
      prev = item;
      break;
    }
  }

  return prev;
}

/**
 * Calculates severity level from a numeric score
 *
 * @param {number} score - Numeric score value
 * @param {Object} config - Configuration with severity thresholds
 * @param {number} [config.highSeverityScoreCutoff] - Cutoff for high severity
 * @param {number} [config.mediumSeverityScoreCutoff] - Cutoff for medium severity
 * @param {Array<Object>} [config.severityBands] - Array of severity bands with min/label/meaning
 * @returns {string} Severity level: 'high', 'moderate', or 'low'
 */
export function severityFromScore(score, config = {}) {
  if (!isNumber(score)) return "";
  if (config?.highSeverityScoreCutoff != null && score >= config.highSeverityScoreCutoff) return "high";
  if (config?.mediumSeverityScoreCutoff != null && score >= config.mediumSeverityScoreCutoff) return "moderate";

  const bands = config?.severityBands;
  if (isEmptyArray(bands) || !isNumber(score)) return "low";

  // Bands assumed sorted desc by min
  for (const band of bands) {
    if (score >= (band.min ?? 0)) return band.label;
  }

  return bands[bands.length - 1]?.label ?? "low";
}

/**
 * Determines meaning text from severity level
 *
 * @param {string} sev - Severity level
 * @param {Object} config - Configuration
 * @param {Function} [config.fallbackMeaningFunc] - Custom meaning function
 * @param {string} [config.meaningQuestionId] - Link ID for meaning question
 * @param {Array<Object>} responses - Response items
 * @param {Object} summaryObject - Summary data object
 * @returns {string|null} Meaning text or null
 */
export function meaningFromSeverity(sev, config = {}, responses = [], summaryObject = {}) {
  if (config?.fallbackMeaningFunc && typeof config.fallbackMeaningFunc === "function") {
    return config.fallbackMeaningFunc(sev, responses, summaryObject);
  }

  const valueFromMeaningQuestionId = (responses || []).find((o) =>
    linkIdEquals(o.id, config?.meaningQuestionId, config?.linkIdMatchMode),
  )?.answer;

  if (valueFromMeaningQuestionId != null) return String(valueFromMeaningQuestionId).replace(/"/g, "");

  const bands = config?.severityBands;
  return bands?.find((b) => b.label === sev)?.meaning ?? null;
}

/**
 * Extracts scoring link ID from configuration
 *
 * @param {Object} config - Configuration object
 * @returns {string|null} Normalized link ID for scoring question
 */
export function getScoringLinkIdFromConfig(config = {}) {
  return normalizeLinkId(config?.scoringQuestionId ? config?.scoringQuestionId : config?.deriveFrom?.linkId);
}

/**
 * Calculates questionnaire score from response items
 *
 * @param {Object} questionnaire - FHIR Questionnaire resource
 * @param {Array<Object>} responseItemsFlat - Flattened response items
 * @param {Object} config - Configuration object
 * @param {Object} ctx - Context with utility methods
 * @returns {Object} Score calculation results with score, questionScores, etc.
 */
export function calculateQuestionnaireScore(questionnaire, responseItemsFlat, config = {}, ctx = {}) {
  const linkIds = config?.questionLinkIds ? config.questionLinkIds.map((id) => normalizeLinkId(id)) : [];
  let scoreLinkIds = !isEmptyArray(linkIds)
    ? linkIds.filter((q) => ctx.isNonScoreLinkId(q, config))
    : !config?.deriveFrom?.linkId
      ? ctx.getAnswerLinkIdsByQuestionnaire(questionnaire, config)
      : [];

  const scoringQuestionId = getScoringLinkIdFromConfig(config);

  if (isEmptyArray(scoreLinkIds) && scoringQuestionId) {
    scoreLinkIds = [scoringQuestionId];
  }

  let scoringQuestionScore = scoringQuestionId
    ? ctx.getScoringByResponseItem(questionnaire, responseItemsFlat, scoringQuestionId, config)
    : null;

  const questionScores = scoreLinkIds.map((id) =>
    ctx.getScoringByResponseItem(questionnaire, responseItemsFlat, id, config),
  );

  const allAnswered = questionScores.length > 0 && questionScores.every((v) => isNumber(v));

  let score = null;

  if (isNumber(scoringQuestionScore)) {
    score = scoringQuestionScore;
  } else if (allAnswered || config?.nullScoreAllowed) {
    // Only sum if all are numbers (already validated by allAnswered)
    score = questionScores.reduce((sum, n) => (n != null ? sum + n : sum), 0);
  } else {
    score = null;
  }

  const subScores = {};
  const subDefs = config?.subScoringQuestions;

  if (!isEmptyArray(subDefs)) {
    for (const def of subDefs) {
      const k = def?.key ?? def?.linkId;
      const linkId = def?.linkId;
      if (!k || !linkId) continue;

      const v = ctx.getScoringByResponseItem(questionnaire, responseItemsFlat, linkId, config);
      subScores[k] = v ?? null;
    }
  }

  return {
    score,
    scoringQuestionScore,
    questionScores,
    scoreLinkIds,
    subScores: removeNullValuesFromObject(subScores),
  };
}

/**
 * Determines if most recent response triggers an alert
 *
 * @param {Object} current - Most recent response row
 * @param {Object} config - Configuration
 * @param {string} [config.alertQuestionId] - Link ID for alert question
 * @param {number} [config.highSeverityScoreCutoff] - Score threshold for alert
 * @returns {boolean} True if alert should be shown
 */
export function getAlertFromMostRecentResponse(current, config = {}) {
  if (!current) return false;

  if (config?.alertQuestionId) {
    return !!(
      current?.responses?.find((o) => linkIdEquals(o.id, config?.alertQuestionId, config?.linkIdMatchMode))?.answer ??
      false
    );
  }

  let alert =
    isNumber(current?.score) &&
    config?.highSeverityScoreCutoff != null &&
    current.score >= config?.highSeverityScoreCutoff;

  return alert;
}

/**
 * Extracts score comparison between current and previous response
 *
 * @param {number|null} currentScore - Current score value
 * @param {number|null} previousScore - Previous score value
 * @returns {'higher'|'lower'|'equal'|null} Comparison result
 */
function getScoreComparison(currentScore, previousScore) {
  if (!isNumber(currentScore) || !isNumber(previousScore)) return null;
  if (currentScore > previousScore) return "higher";
  if (currentScore < previousScore) return "lower";
  return "equal";
}

/**
 * Generates scoring parameters from response data
 *
 * @param {Array<Object>} responses - Array of response rows
 * @param {Object} config - Configuration object
 * @returns {Object|null} Scoring parameters including current/previous scores, comparison, severity
 */
export function getScoreParamsFromResponses(responses, config = {}) {
  if (isEmptyArray(responses)) return null;

  const current = getMostRecentResponseRow(responses);
  const prev = getPreviousResponseRowWithScore(responses);

  const curScore = current.score != null ? current.score : null;
  const prevScore = prev?.score != null ? prev.score : null;
  const minScore = isNumber(config?.minimumScore) ? config?.minimumScore : 0;
  const maxScore = isNumber(config?.maximumScore) ? config?.maximumScore : null;
  const comparisonToAlert = config?.comparisonToAlert ?? "higher";
  const comparison = getScoreComparison(curScore, prevScore);
  const score = curScore;
  const scoreSeverity = severityFromScore(score, config);
  const meaning = meaningFromSeverity(scoreSeverity, config, current?.responses, current);
  const source = current?.source;
  const alert = getAlertFromMostRecentResponse(current, config);
  const warning =
    isNumber(score) && config?.mediumSeverityScoreCutoff != null && score >= config?.mediumSeverityScoreCutoff;

  const scoringParams = {
    ...config,
    score,
    scoreSeverity,
    currentScore: curScore,
    previousScore: prevScore,
    alert,
    warning,
    minScore,
    maxScore,
    meaning,
    text: meaning,
    comparison,
    comparisonToAlert,
    source,
  };

  return {
    ...scoringParams,
    scoringParams: scoringParams,
  };
}
export function getQuestionnaireFromRowData(rowData, qResources = []) {
  if (!rowData) return null;
  if (rowData.questionnaire) return rowData.questionnaire;
  const id = rowData.deriveFrom && rowData.deriveFrom.hostIds ? rowData.deriveFrom.hostIds : null;
  const matchedResources = getResourcesByResourceType(qResources, "questionnaire");
  if (!id || isEmptyArray(matchedResources)) return null;
  if (Array.isArray(id)) {
    if (!isEmptyArray(id)) return matchedResources.find((q) => id[0].includes(q?.id));
    return null;
  }
  return matchedResources.find((q) => id.includes(q?.id));
}

export function getComparisonDisplayIconByRow(row, iconProps = {}) {
  const comparison = row?.comparison;
  const comparisonToAlert = row?.comparisonToAlert;
  if (!comparison) return null;
  if (comparison === "equal") return <HorizontalRuleIcon aria-label="No change" {...iconProps} />;
  if (comparisonToAlert === "lower") {
    if (comparison === "lower") return <SouthIcon color="error" aria-label="Change to worse" {...iconProps} />;
    if (comparison === "higher") return <NorthIcon color="info" aria-label="Change to better" {...iconProps} />;
    return comparison;
  } else {
    if (comparison === "higher") return <NorthIcon color="error" aria-label="Change to worse" {...iconProps} />;
    if (comparison === "lower") return <SouthIcon color="info" aria-label="Change to better" {...iconProps} />;
    return comparison;
  }
}

export function getScoreRangeDisplayByRow(row) {
  if (!row) return null;
  const { responses, minScore, maxScore, minimumScore, maximumScore, score } = row;
  if (!responses || isEmptyArray(responses)) return "";
  if (score == null) return "";
  const minScoreToUse = isNumber(minScore) ? minScore : isNumber(minimumScore) ? minimumScore : 0;
  const maxScoreToUse = isNumber(maxScore) ? maxScore : isNumber(maximumScore) ? maximumScore : 0;
  if (!isNumber(minScoreToUse) || !isNumber(maxScoreToUse)) return "";
  if (minScoreToUse === maxScoreToUse) return "";
  return `( ${minScoreToUse} - ${maxScoreToUse} )`;
}

export function getNumAnsweredDisplayByRow(row) {
  if (!row) return null;
  const { responses, totalItems, totalAnsweredItems } = row;
  if (!responses || isEmptyArray(responses)) return "No";
  if (!totalItems && !totalAnsweredItems) return "No";
  if (totalItems === 1 && totalAnsweredItems === 1) return "Yes";
  if (isNumber(totalAnsweredItems) && isNumber(totalItems))
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={0.4}
        aria-label={`${totalAnsweredItems} of ${totalItems} items answered`}
        role="img"
      >
        <Typography variant="body2">{totalAnsweredItems}</Typography>
        <Divider flexItem sx={{ width: 24, alignSelf: "auto", backgroundColor: "rgba(132, 129, 129, 0.6)" }} />
        <Typography variant="body2">{totalItems}</Typography>
      </Stack>
    );
  if (totalAnsweredItems) return "Yes";
  return "No";
}

export function getTitleByRow(row) {
  if (!row) return "Untitled Measure";
  let title = "";
  if (row.title) {
    title = row.title;
  } else if (row.instrumentName) {
    title = row.instrumentName;
  } else if (row.key) {
    title = row.key;
  } else {
    if (row.questionnaire && row.questionnaire.title) {
      title = row.questionnaire.title;
    }
  }
  if (title) return getDisplayQTitle(title);
  return "Untitled Measure";
}

export function getNormalizedRowTitleDisplay(text, row) {
  if (!text) return "";
  return text.replace("{date}", row?.date ? getLocaleDateStringFromDate(row?.date) : "most recent");
}

export function getNoDataDisplay() {
  return <span className="no-data-wrapper">-</span>;
}

export function getResponseColumns(data) {
  if (isEmptyArray(data)) return [];
  const dates = data ?? [];

  // tiny safe normalizer to avoid raw objects rendering
  const normalize = (v) => {
    if (v == null || String(v) === "" || String(v) === "null" || String(v) === "undefined") return "—";
    if (typeof v === "string" || typeof v === "number") {
      if (String(v).toLowerCase() === "tbd") return "-";
      return v;
    }
    if (React.isValidElement(v)) return v;
    if (Array.isArray(v)) return v.join(", ");
    return "-";
  };

  return [
    {
      title: "",
      field: "question",
      filtering: false,
      sorting: false,
      cellStyle: {
        position: "sticky",
        left: 0,
        backgroundColor: "#FFF",
        borderRight: "1px solid rgba(224, 224, 224, 1)",
        minWidth: "240px",
      },
      render: (rowData) => {
        const q = rowData?.question ?? "";
        const config = rowData?.config;
        const cleaned = typeof q === "string" ? q.replace(/\s*\([^)]*\)/g, "").trim() : "";
        const normalizedClean = normalizeStr(cleaned);
        const isQuestion =
          IS_QUESTION_COLUMN_KEYWORDS.some(
            (keyword) => normalizedClean === keyword || normalizedClean.includes(keyword),
          ) && normalizedClean.length < 50;

        if (typeof q === "string" && (normalizeStr(cleaned) === normalizeStr(config?.title) || isQuestion)) {
          return (
            <span className={`${isQuestion ? "question-row" : ""}`}>
              <b>{q}</b>
            </span>
          );
        }
        // fall back to normalized string if not a plain string
        if (typeof q !== "string") return stripHtmlTags(normalize(q));
        return stripHtmlTags(q);
      },
    },
    ...dates.map((item, index) => ({
      id: `date_${item.id}_${index}`,
      title: item.columnDisplayDate,
      field: item.id, // the row is expected to have row[item.id]
      cellStyle: {
        minWidth: "148px",
        borderRight: "1px solid #ececec",
      },
      spanFullRow: !!item.readyOnly,
      render: (rowData) => {
        const rowDataItem = rowData?.[item.id];
        if (rowData.readOnly) return <span className="text-readonly"></span>;
        // if (isNumber(rowDataItem)) return rowDataItem;
        // explicit placeholders prevent React from trying to render objects
        if (!rowDataItem || String(rowDataItem) === "null" || String(rowDataItem) === "undefined")
          return EMPTY_CELL_STRING;
        if (rowDataItem.hasMeaningOnly) {
          const { key, ...rest } = rowDataItem;
          if (!rowDataItem.meaning) return EMPTY_CELL_STRING;
          return <Meaning {...rest}></Meaning>;
        }
        // numeric score path
        if (rowDataItem.score != null) {
          const { key, ...params } = rowDataItem.scoringParams ?? {};
          return (
            <Stack gap={1} className="score-wrapper">
              <Scoring
                // instrumentId is optional; provide if we have it on the cell
                instrumentId={rowDataItem.instrumentId}
                score={rowDataItem.score}
                // pass only the params object; Scoring already expects an object here
                scoreParams={{ ...rowDataItem, ...params }}
              />
              {rowDataItem.scoringParams && <Meaning {...params}></Meaning>}
            </Stack>
          );
        }
        const contentToRender =
          typeof rowDataItem === "string" || isNumber(rowDataItem)
            ? stripHtmlTags(rowDataItem)
            : normalize(rowDataItem);
        if (contentToRender) return contentToRender;
        // string answers render directly; everything else is safely stringified
        return EMPTY_CELL_STRING;
      },
    })),
  ];
}

export function buildReportData({ summaryData = {}, bundle = [] }) {
  let skeleton = Object.assign({}, report_config);
  if (!skeleton || !skeleton.sections || !Array.isArray(skeleton.sections)) {
    console.error("buildReportData: Invalid report_config structure");
    return skeleton || { sections: [] };
  }
  skeleton.sections.forEach((section) => {
    const tables = section.tables;
    if (isEmptyArray(tables)) return true;
    const keysToMatch = tables.map((table) => table.dataKeysToMatch ?? []).flat();
    const arrDates = keysToMatch.flatMap((key) => {
      const d = summaryData ? summaryData[key] : null;
      if (!d || isEmptyArray(d.chartData?.data)) return [];
      return d.chartData.data.map((o) => o.date);
    });
    const dates = !isEmptyArray(arrDates) ? [...new Set(arrDates)] : [];
    const datesToUse = dates.filter((item) => {
      const timestamp = item instanceof Date ? item.getTime() : new Date(item).getTime();
      return timestamp > CUT_OFF_TIMESTAMP_ON_GRAPH;
    });
    const hasOlderData = !!dates.find((item) => {
      const timestamp = item instanceof Date ? item.getTime() : new Date(item).getTime();
      return timestamp < CUT_OFF_TIMESTAMP_ON_GRAPH;
    });
    let truncationTimestamp;
    if (hasOlderData) {
      const minTimestamp = Math.min(...datesToUse);
      truncationTimestamp = dayjs(new Date(minTimestamp)).subtract(2, "month").valueOf();
    }
    let xDomain = getDateDomain(dates, {
      padding: dates.length <= 2 ? 0.25 : 0.05,
    });
    tables.forEach((table) => {
      const dataKeysToMatch = table.dataKeysToMatch;
      let rows = [];
      let charts = [];
      if (isEmptyArray(dataKeysToMatch)) {
        return true;
      }
      dataKeysToMatch.forEach((key) => {
        const matchData = summaryData[key];
        const processedData = getProcessedQuestionnaireData(key, { summaryData, bundle });
        let currentData = matchData && matchData.scoringSummaryData ? matchData.scoringSummaryData : null;
        if (!currentData) {
          currentData = processedData?.scoringSummaryData;
        }
        const chartData =
          summaryData[key] && summaryData[key].chartData ? summaryData[key].chartData : processedData?.chartData;
        if (!currentData) {
          console.warn(`buildReportData: No scoringSummaryData found for key "${key}"`);
        }
        rows.push({
          ...(currentData ?? {}),
        });
        if (chartData) {
          charts.push({
            ...(chartData?.scoringParams ?? {}),
            ...(chartData ?? {}),
            truncationTimestamp,
            xDomain,
          });
        }
      });
      table.rows = rows;
      table.charts = charts;
    });
  });
  return skeleton;
}
