import {
  conceptText,
  getDefaultQuestionItemText,
  getValidObservationsForQRs,
  getValueFromResource,
  getResourcesByResourceType,
  linkIdEquals,
  normalizeLinkId,
  makeQuestionItem,
} from "@util/fhirUtil";
import { generateUUID, isEmptyArray, isNil, isNumber } from "@util";
import { DEFAULT_ANSWER_OPTIONS } from "@/consts";
import { findMatchingQuestionLinkIdFromCode } from "@/config/questionnaire_config";

/* ---------------------------------------------
 * External helpers
 * Each helper receives a `ctx` (the builder instance)
 * so it can use cfg + utility methods without importing.
 * --------------------------------------------- */

/** SLUMS (education-aware) */
export function summarizeSLUMHelper(ctx, questionnaireResponses, questionnaire, opts = {}) {
  const SCORING_QID = ctx.cfg.scoringQuestionId || "71492-3";
  const conditions = opts.conditions || getResourcesByResourceType(ctx.patientBundle);
  const hasLowerLevelEducation = !isEmptyArray(conditions)
    ? conditions.some((c) =>
        (c?.code?.coding || []).some((cd) => (cd?.code || "").toString().toUpperCase() === "Z55.5"),
      )
    : false;

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);
    let score = ctx.getScoringByResponseItem(questionnaire, flat, SCORING_QID);
    if (typeof score !== "number") {
      const formatted = ctx.formattedResponses(questionnaire?.item ?? [], flat);
      const firstAns = formatted?.[0]?.answer;
      const parsed = Number(firstAns);
      score = Number.isFinite(parsed) ? parsed : null;
    }

    const educationLevel = hasLowerLevelEducation ? "low" : "high";
    let scoreSeverity = "low";
    if (score != null) {
      if (educationLevel === "low" && score <= 19) scoreSeverity = "high";
      else if (educationLevel === "high" && score <= 20) scoreSeverity = "high";
    }

    const totalItems = ctx.getAnswerLinkIdsByQuestionnaire(questionnaire).length;
    const totalAnsweredItems = flat.filter((it) => !linkIdEquals(it.linkId, SCORING_QID)).length;

    let responses = ctx.formattedResponses(questionnaire?.item ?? null, flat);
    if (!responses.length) responses = ctx.responsesOnly(flat);

    return {
      id: qr.id,
      date: ctx.dateTimeText(qr.authored),
      responses,
      score,
      scoreSeverity,
      scoreMeaning: ctx.meaningFromSeverity(scoreSeverity),
      comparisonToAlert: "lower",
      scoringParams: { maximumScore: ctx.cfg.scoringParams?.maximumScore ?? 30 },
      highSeverityScoreCutoff: hasLowerLevelEducation ? 19 : 20,
      totalAnsweredItems,
      totalItems,
      authoredDate: qr.authored,
      lastUpdated: qr.meta?.lastUpdated,
      educationLevel,
    };
  });

  return ctx.sortByNewestAuthoredOrUpdated(rows);
}

/** C-IDAS (18-item sum + suicide flag) */
export function summarizeCIDASHelper(
  ctx,
  questionnaireResponses,
  questionnaire,
  {
    itemLinkIds,
    suicideLinkId = "cs-idas-15",
    scoringQuestionId = ctx.cfg.scoringQuestionId || "c-ids-score",
    maximumScore = 36,
    highSeverityScoreCutoff = 19,
  } = {},
) {
  const DEFAULT_IDS = Array.from({ length: 18 }, (_, i) => `cs-idas-${i + 1}`);
  const IDS = Array.isArray(itemLinkIds) && itemLinkIds.length ? itemLinkIds : DEFAULT_IDS;
  const coalesceNum = (n, fb = 0) => (typeof n === "number" && Number.isFinite(n) ? n : fb);

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);

    const perItemScores = IDS.map((id) => coalesceNum(ctx.getScoringByResponseItem(questionnaire, flat, id), 0));
    const score = perItemScores.reduce((a, b) => a + b, 0);

    const suicideScore = coalesceNum(ctx.getScoringByResponseItem(questionnaire, flat, suicideLinkId), 0);
    const scoreSeverity = score > 18 || suicideScore >= 1 ? "high" : "low";

    const responses = ctx.formattedResponses(questionnaire?.item ?? [], flat);
    const totalItems = ctx.getAnswerLinkIdsByQuestionnaire(questionnaire).length;
    const totalAnsweredItems = flat.filter((it) => !linkIdEquals(it.linkId, scoringQuestionId)).length;

    return {
      id: qr.id,
      date: ctx.dateTimeText(qr.authored),
      responses,
      score,
      scoreSeverity,
      highSeverityScoreCutoff,
      scoreMeaning: ctx.meaningFromSeverity(scoreSeverity),
      alertNote: suicideScore >= 1 ? "suicide concern" : null,
      scoringParams: { maximumScore },
      totalAnsweredItems,
      totalItems,
      authoredDate: qr.authored,
      lastUpdated: qr.meta?.lastUpdated,
    };
  });

  return ctx.sortByNewestAuthoredOrUpdated(rows);
}

/** Mini-Cog (recall + clock + total) */
export function summarizeMiniCogHelper(
  ctx,
  questionnaireResponses,
  questionnaire,
  {
    recallLinkIds = ["minicog-question1"],
    clockLinkId = "minicog-question2",
    totalLinkId = "minicog-total-score",
    highSeverityScoreCutoff = 3,
  } = {},
) {
  const clamp = (n, lo, hi) => Math.min(Math.max(Number(n ?? 0), lo), hi);

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);

    // Recall score
    let recallScore = null;
    if (recallLinkIds.length === 1) {
      const v = ctx.getScoringByResponseItem(questionnaire, flat, recallLinkIds[0]);
      recallScore = typeof v === "number" ? clamp(v, 0, 3) : null;
    } else {
      const parts = recallLinkIds
        .map((id) => ctx.getScoringByResponseItem(questionnaire, flat, id))
        .map((x) => (typeof x === "number" ? x : 0));
      recallScore = clamp(
        parts.reduce((a, b) => a + b, 0),
        0,
        3,
      );
    }

    // Clock score (coerce >=1 to 2; else 0)
    const clockRaw = ctx.getScoringByResponseItem(questionnaire, flat, clockLinkId);
    const clockScore = typeof clockRaw === "number" ? (clockRaw >= 1 ? 2 : 0) : null;

    // Total score
    const totalRaw = ctx.getScoringByResponseItem(questionnaire, flat, totalLinkId);
    const computed =
      typeof recallScore === "number" && typeof clockScore === "number" ? recallScore + clockScore : null;
    const totalScore =
      typeof totalRaw === "number"
        ? clamp(totalRaw, 0, 5)
        : typeof computed === "number"
          ? clamp(computed, 0, 5)
          : null;

    const scoreSeverity = ctx.severityFromScore(totalScore);

    const HIDE_IDS = new Set([
      "introduction",
      "minicog-question1-instruction",
      "minicog-question2-instruction",
      "minicog-total-score-explanation",
      "minicog-questionnaire-footnote",
    ]);

    let responses = ctx.formattedResponses(questionnaire?.item ?? [], flat).filter((r) => !HIDE_IDS.has(r.id));
    if (!responses.length) responses = ctx.responsesOnly(flat);

    const totalItems = ctx.getAnswerLinkIdsByQuestionnaire(questionnaire).length;
    const totalAnsweredItems = flat.filter((it) => !linkIdEquals(it.linkId, totalLinkId)).length;

    return {
      id: qr.id,
      date: ctx.dateTimeText(qr.authored),
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
      scoreMeaning: ctx.meaningFromSeverity(scoreSeverity),
      comparisonToAlert: "lower",
      scoringParams: ctx.cfg.scoringParams ?? { maximumScore: 5 },
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
    const match = resources.find(o => findMatchingQuestionLinkIdFromCode(o, qLinkIdList));
    const defaultQText = getDefaultQuestionItemText(lid, idx);
    const text = match ? conceptText(match) : (config.itemTextByLinkId?.[lid] ?? defaultQText);
    return makeQuestionItem(lid, text, opts);
  });

  // optional total score item (readOnly)
  if (config.scoringQuestionId) {
    items.push({
      linkId: config.scoringQuestionId,
      type: "decimal",
      text: "Total score",
      readOnly: true,
      code: [{ system: "http://loinc.org", code: normalizeLinkId(config.scoringQuestionId) }],
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

/* -------------------- Observations to QuestionnaireResponse -------------------- */
export function observationsToQuestionnaireResponse(group, config = {}) {
  if (isEmptyArray(group)) return null;
  const trimToMinutes = (dtString) => {
    if (!dtString) return dtString;
    const d = new Date(dtString);
    // Keep only "YYYY-MM-DDTHH:MM"
    return d.toISOString().slice(0, 16);
  };
  const subject = config.getSubject?.(group) || group[0]?.subject || undefined;
  const authored =
    config.getAuthored?.(group) ||
    trimToMinutes(group[0]?.effectiveDateTime) ||
    trimToMinutes(group[0]?.issued) ||
    new Date().toISOString();
  const qLinkIdList = config?.questionLinkIds?.map((id) => normalizeLinkId(id));

  // map answers
  const answersByLinkId = new Map();
  const textByLinkId = new Map();
  for (const obs of group) {
    let lid = normalizeLinkId(
      config.getLinkId
        ? config.getLinkId(obs, config)
        : (findMatchingQuestionLinkIdFromCode(obs, qLinkIdList) ?? obs.id),
    );
    if (!lid) continue;
    const ans = config.answerMapper ? config.answerMapper(obs) : getValueFromResource(obs);
    if (!isNil(ans)) answersByLinkId.set(lid, ans);
    textByLinkId.set(lid, conceptText(obs.code));
  }

  let qLinkIds = Array.from(answersByLinkId.keys()) || qLinkIdList || [];
  if (
    config?.scoringQuestionId &&
    !qLinkIds.find((qid) => normalizeLinkId(qid) === normalizeLinkId(config?.scoringQuestionId))
  ) {
    qLinkIds.push(normalizeLinkId(config.scoringQuestionId));
  }

  const items = [...new Set(qLinkIds)].map((lid) => {
    const ans = answersByLinkId.get(lid);
    const text = textByLinkId.get(lid);
    let answerObject = {
      linkId: lid,
      text: text ? text : getDefaultQuestionItemText(normalizeLinkId(lid)),
    };
    if (ans) {
      answerObject["answer"] = [ans];
    }
    return answerObject;
  });

  return {
    id: generateUUID(),
    resourceType: "QuestionnaireResponse",
    status: "completed",
    questionnaire: `Questionnaire/${config.questionnaireId}`,
    subject,
    authored,
    item: items,
  };
}

export function observationsToQuestionnaireResponses(observationResources, config = {}) {
  if (isEmptyArray(observationResources)) return [];
  const observations = getValidObservationsForQRs(observationResources);
  /** Group obs by effectiveDateTime (fallback to issued or "unknown") */
  const groupBy = (observations) => {
    const byGroup = new Map();
    for (const o of observations || []) {
      const key = o.effectiveDateTime || o.issued || o.encounter?.reference || "unknown";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(o);
    }
    return byGroup;
  };
  const groupByKey = groupBy(observations || []);
  const out = [];
  for (const [, group] of groupByKey.entries()) {
    const qr = observationsToQuestionnaireResponse(group, config);
    if (qr) out.push(qr);
  }
  return out.sort((a, b) => String(a.authored).localeCompare(String(b.authored)));
}

/**
 * @param {Array} rdata
 * @returns {Array}
 */
const sortResponsesNewestFirst = (rdata = []) =>
  [...rdata].sort((a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime());

/**
 * @param {Array} rdata
 */
const getMostRecent = (rdata = []) => sortResponsesNewestFirst(rdata)[0] || null;

/**
 * @param {Array} rdata
 */
const getPreviousWithScore = (rdata = []) => {
  const rows = sortResponsesNewestFirst(rdata);
  if (isEmptyArray(rows) || rows.length < 2) return null;
  let prev = null;
  for (let i = 1; i < rows.length; i++) {
    const item = rows[i];
    if (isNumber(item?.score)) {
      prev = item;
      break;
    }
  }
  return prev;
};

/**
 * Build rows from summaryData
 * @param {Object<string, any>} summaryData
 * @param {Object} [opts]
 * @param {(key:string, questionnaire?:any) => (string|null|undefined)} [opts.instrumentNameByKey]
 * @param {(iso:string|Date|null|undefined) => (string|null|undefined)} [opts.formatDate]
 * @returns {Array<Object>}
 */
export function buildScoringSummaryRows(summaryData, opts = {}) {
  if (!summaryData) return [];

  const { instrumentNameByKey, formatDate } = opts;

  return Object.keys(summaryData).map((key) => {
    const node = summaryData[key] || {};
    const q = node.questionnaire || null;
    const responses = node.responseData || [];

    const current = getMostRecent(responses);
    const prev = getPreviousWithScore(responses);

    const instrumentName =
      (instrumentNameByKey && instrumentNameByKey(key, q)) || q?.shortName || q?.displayName || key;

    const lastAssessedISO = current?.date ?? null;
    const lastAssessed = formatDate ? formatDate(lastAssessedISO) : lastAssessedISO;

    const curScore = isNumber(current?.score) ? current.score : (current?.score ?? null);
    const minScore = isNumber(current?.scoringParams?.minimumScore) ? current.scoringParams.minimumScore : 0;
    const maxScore = isNumber(current?.scoringParams?.maximumScore) ? current.scoringParams.maximumScore : null;

    const totalAnswered = isNumber(current?.totalAnsweredItems) ? current.totalAnsweredItems : null;
    const totalItems = isNumber(current?.totalItems) ? current.totalItems : null;

    const meaning = current?.scoreMeaning ?? null;
    const comparisonToAlert = current?.comparisonToAlert ?? "";

    const prevScore = isNumber(prev?.score) ? prev.score : null;

    let comparison = null; // "higher" | "lower" | "equal" | null
    if (prevScore != null && curScore != null && isNumber(curScore) && isNumber(prevScore)) {
      if (curScore > prevScore) comparison = "higher";
      else if (curScore < prevScore) comparison = "lower";
      else comparison = "equal";
    }

    const scoringParams = current;

    return {
      key,
      instrumentName,
      lastAssessed,
      score: isNumber(curScore) ? curScore : (curScore ?? null),
      minScore,
      maxScore,
      totalAnswered,
      totalItems,
      meaning,
      comparison,
      comparisonToAlert,
      scoringParams,
      raw: node, // keep original if the UI needs to drill in (optional)
    };
  });
}
