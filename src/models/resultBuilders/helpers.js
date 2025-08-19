import {
  conceptText,
  getDefaultQuestionItemText,
  getFlowsheetId,
  getLinkIdByFromFlowsheetId,
  getValueFromResource,
  getResourcesByResourceType,
  linkIdEquals,
  makeQuestionItem,
} from "@util/fhirUtil";
import { generateUUID, isEmptyArray } from "@util";
import { DEFAULT_ANSWER_OPTIONS } from "@/consts";

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
export function buildQuestionnaire(config = {}) {
  const items = (config.questionLinkIds || []).map((lid, idx) => {
    const opts = config.answerOptionsByLinkId?.[lid] ?? DEFAULT_ANSWER_OPTIONS;
    return makeQuestionItem(lid, config.itemTextByLinkId?.[lid] ?? getDefaultQuestionItemText(lid, idx), opts);
  });

  // optional total score item (readOnly)
  if (config.scoringQuestionId) {
    items.push({
      linkId: config.scoringQuestionId,
      type: "decimal",
      text: "Total score",
      readOnly: true,
      code: [{ system: "http://loinc.org", code: config.scoringQuestionId }],
    });
  }

  return {
    resourceType: "Questionnaire",
    id: config.questionnaireId || generateUUID(),
    url: config.questionnaireUrl,
    questionnaire: `Questionnaire/${config.questionnaireId}`,
    name: (config.questionnaireName || "").toUpperCase(),
    title: config.title || config.questionnaireName || "Questionnaire",
    status: "active",
    date: new Date().toISOString().slice(0, 10),
    item: items,
  };
}

/* -------------------- Observations to QuestionnaireResponse -------------------- */
export function observationsToQuestionnaireResponse(group, config = {}) {
  if (isEmptyArray(group)) return null;
  const subject = config.getSubject?.(group) || group[0]?.subject || undefined;
  const authored =
    config.getAuthored?.(group) || group[0]?.effectiveDateTime || group[0]?.issued || new Date().toISOString();

  // map answers
  const answersByLinkId = new Map();
  const textByLinkId = new Map();
  for (const obs of group) {
    const lid = config.getLinkId ? config.getLinkId(obs) : getLinkIdByFromFlowsheetId(getFlowsheetId(obs));
    if (!lid) continue;
    const ans = config.answerMapper ? config.answerMapper(obs) : getValueFromResource(obs);
    if (!ans) continue;
    answersByLinkId.set(lid, ans);
    textByLinkId.set(lid, conceptText(obs.code));
  }

  let qLinkIds = config?.questionLinkIds || [];
  if (config?.scoringQuestionId) {
    qLinkIds.push(config.scoringQuestionId)
  }

  const items = [...new Set(qLinkIds)].map((lid) => {
    const ans = answersByLinkId.get(lid);
    return ans ? { linkId: lid, text: textByLinkId.get(lid), answer: [ans] } : { linkId: lid };
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

export function observationsToQuestionnaireResponses(observations, config = {}) {
  /** Group obs by effectiveDateTime (fallback to issued or "unknown") */
  const groupByEffectiveTime = (observations) => {
    const byTime = new Map();
    for (const o of observations || []) {
      const key = o.effectiveDateTime || o.issued || "unknown";
      if (!byTime.has(key)) byTime.set(key, []);
      byTime.get(key).push(o);
    }
    return byTime;
  };
  const byTime = groupByEffectiveTime(observations || []);
  const out = [];
  for (const [, group] of byTime.entries()) {
    const qr = observationsToQuestionnaireResponse(group, config);
    if (qr) out.push(qr);
  }
  return out.sort((a, b) => String(a.authored).localeCompare(String(b.authored)));
}
