import React from "react";
import {
  conceptText,
  getDefaultQuestionItemText,
  getValidObservationsForQRs,
  // getValueFromResource,
  getResourcesByResourceType,
  linkIdEquals,
  normalizeLinkId,
  makeQuestionItem,
} from "@util/fhirUtil";
import { getLocaleDateStringFromDate, generateUUID, isEmptyArray, isNil, isNumber, isPlainObject } from "@util";
import Scoring from "@components/Score";
import { DEFAULT_ANSWER_OPTIONS } from "@/consts";
import { getDateDomain } from "@/config/chart_config";
import { findMatchingQuestionLinkIdFromCode, getConfigForQuestionnaire } from "@/config/questionnaire_config";
import { report_config } from "@/config/report_config";

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
      ...getConfigForQuestionnaire(questionnaire?.id),
      id: qr.id,
      date: qr.authored ?? null,
      responses,
      score,
      scoreSeverity,
      scoreMeaning: meaningFromSeverity(scoreSeverity),
      comparisonToAlert: "lower",
      scoringParams: { ...ctx.cfg, scoreSeverity: scoreSeverity },
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
      ...getConfigForQuestionnaire(questionnaire?.id),
      id: qr.id,
      instrumentName: "C-IDAS",
      date: qr.authored ?? null,
      responses,
      score,
      scoreSeverity,
      highSeverityScoreCutoff,
      scoreMeaning: meaningFromSeverity(scoreSeverity),
      alertNote: suicideScore >= 1 ? "suicide concern" : null,
      scoringParams: { ...ctx.config, maximumScore, scoreSeverity },
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

    const scoreSeverity = severityFromScore(totalScore);

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
      scoreMeaning: meaningFromSeverity(scoreSeverity),
      comparisonToAlert: "lower",
      scoringParams: { ...(ctx.cfg ?? { maximumScore: 5 }), scoreSeverity },
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
    const match = resources.find((o) => findMatchingQuestionLinkIdFromCode(o, qLinkIdList));
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
export function getQuestionnaireResponseSkeleton(questionnaireID = "dummy101") {
  return {
    id: generateUUID(),
    resourceType: "QuestionnaireResponse",
    status: "completed",
    questionnaire: `Questionnaire/${questionnaireID}`,
  };
}

/* -------------------- Observations to QuestionnaireResponse -------------------- */
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
  if (obs.valueCodeableConcept?.coding?.length) {
    const { system, code, display } = obs.valueCodeableConcept.coding[0];
    const coding = {};
    if (system !== undefined) coding.system = system;
    if (code !== undefined) coding.code = code;
    if (display !== undefined) coding.display = display;
    return { valueCoding: coding };
  }

  // String
  if (typeof obs.valueString === "string") return { valueString: obs.valueString };

  // Fallback: no answer
  return null;
}

export function observationsToQuestionnaireResponse(group, config = {}) {
  if (isEmptyArray(group)) return null;
  const trimToMinutes = (dtString) => {
    if (!dtString) return dtString;
    const d = new Date(dtString);
    // Keep only "YYYY-MM-DDTHH:MM"
    return d.toISOString().slice(0, 16);
  };
  const subject = config.getSubject?.(group) || group[0]?.subject || undefined;
  const extension = group[0].extension;
  const identifier = group[0].identifier;
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
    const ans = defaultAnswerMapperFromObservation(obs);
    if (!isNil(ans)) answersByLinkId.set(lid, ans);
    textByLinkId.set(lid, conceptText(obs.code));
  }

  const answerLinkIdList = Array.from(answersByLinkId.keys());

  let qLinkIds = !isEmptyArray(answerLinkIdList) ? answerLinkIdList : qLinkIdList || [];
  if (
    config?.scoringQuestionId &&
    !qLinkIds.find((qid) => normalizeLinkId(qid) === normalizeLinkId(config?.scoringQuestionId))
  ) {
    qLinkIds.push(normalizeLinkId(config.scoringQuestionId));
  }

  const items = [...new Set(qLinkIds)].map((lid) => {
    const objAns = answersByLinkId.get(lid);
    const text = textByLinkId.get(lid);
    const item = {
      linkId: lid,
      text: text ? text : getDefaultQuestionItemText(normalizeLinkId(lid)),
    };
    if (!isNil(objAns)) {
      item.answer = Array.isArray(objAns) ? objAns : isPlainObject(objAns) ? new Array(objAns) : [objAns];
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
export function sortResponsesNewestFirst(rdata = []) {
  return [...rdata].sort((a, b) => new Date(b?.date ?? 0).getTime() - new Date(a?.date ?? 0).getTime());
}
/**
 * @param {Array} rdata
 */
export function getMostRecentResponseRow(rdata = []) {
  return sortResponsesNewestFirst(rdata)[0] || null;
}

/**
 * @param {Array} rdata
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

export function severityFromScore(score, config = {}) {
  if (config?.highSeverityScoreCutoff && score >= config?.highSeverityScoreCutoff) return "high";
  if (config?.mediumSeverityScoreCutoff && score >= config?.mediumSeverityScoreCutoff) return "moderate";
  const bands = config?.severityBands;
  if (isEmptyArray(bands) || !isNumber(score)) return "low";

  // bands assumed sorted desc by min
  for (const band of bands) {
    if (score >= (band.min ?? 0)) return band.label;
  }
  return bands[bands.length - 1]?.label ?? "low";
}

export function meaningFromSeverity(sev, config = {}) {
  const bands = config?.severityBands;
  if (!isEmptyArray(bands)) return bands.find((b) => b.label === sev)?.meaning ?? null;
  return null;
}

export function getScoreParamsFromResponses(responses, config = {}) {
  if (isEmptyArray(responses)) return null;
  const current = getMostRecentResponseRow(responses);
  const prev = getPreviousResponseRowWithScore(responses);
  const curScore = isNumber(current?.score) ? current.score : (current?.score ?? null);
  const prevScore = isNumber(prev?.score) ? prev.score : null;
  const minScore = isNumber(config?.minimumScore) ? config?.minimumScore : 0;
  const maxScore = isNumber(config?.maximumScore) ? config?.maximumScore : null;
  const comparisonToAlert = config?.comparisonToAlert ?? "higher";

  let comparison = null; // "higher" | "lower" | "equal" | null
  if (prevScore != null && curScore != null && isNumber(curScore) && isNumber(prevScore)) {
    if (curScore > prevScore) comparison = "higher";
    else if (curScore < prevScore) comparison = "lower";
    else comparison = "equal";
  }
  const score = isNumber(curScore) ? curScore : (curScore ?? null);
  const scoreSeverity = severityFromScore(score, config);
  const meaning = meaningFromSeverity(scoreSeverity, config);
  const source = current?.source;
  const alert = isNumber(score) && score >= config?.highSeverityScoreCutoff;
  const warning = isNumber(score) && score >= config?.mediumSeverityScoreCutoff;
  const scoringParams = {
    ...config,
    // ...(current?.scoringParams ?? {}),
    score,
    scoreSeverity,
    currentScore: curScore,
    previousScore: prevScore,
    alert,
    warning,
    minScore,
    maxScore,
    meaning,
    comparison,
    comparisonToAlert,
    source,
  };
  return {
    ...scoringParams,
    scoringParams: scoringParams,
  };
}

export function getResponseColumns(data) {
  if (isEmptyArray(data)) return [];

  const sources = [...new Set(data.filter((item) => !!item.source).map((item) => item.source))];
  const dates =
    data?.map((item) => ({ date: item.date, id: item.id, source: sources.length > 1 ? item.source : null })) ?? [];

  // tiny safe normalizer to avoid raw objects rendering
  const normalize = (v) => {
    if (v == null || String(v) === "null" || String(v) === "undefined") return "—";
    if (typeof v === "string" || typeof v === "number") return v;
    if (React.isValidElement(v)) return v;
    if (Array.isArray(v)) return v.join(", ");
    return "--";
  };

  return [
    {
      title: "Questions",
      field: "question",
      filtering: false,
      cellStyle: {
        position: "sticky",
        left: 0,
        backgroundColor: "#FFF",
        borderRight: "1px solid #ececec",
        minWidth: "200px",
      },
      render: (rowData) => {
        const q = rowData?.question;
        if (typeof q === "string" && q.toLowerCase() === "score") {
          return <b>{q}</b>;
        }
        // fall back to normalized string if not a plain string
        if (typeof q !== "string") return normalize(q);
        return <span dangerouslySetInnerHTML={{ __html: q }} />;
      },
    },
    ...dates.map((item, index) => ({
      id: `date_${item.id}_${index}`,
      title: `${getLocaleDateStringFromDate(item.date)} ${item.source ? " ( " + item.source + " ) ": ""}`.trim(),
      field: item.id, // the row is expected to have row[item.id]
      cellStyle: {
        minWidth: "148px",
        borderRight: "1px solid #ececec",
      },
      render: (rowData) => {
        const rowDataItem = rowData?.[item.id];

        // explicit placeholders prevent React from trying to render objects
        if (!rowDataItem || String(rowDataItem) === "null" || String(rowDataItem) === "undefined") return "—";

        // numeric score path (your happy path)
        if (isNumber(rowDataItem.score)) {
          return (
            <Scoring
              // instrumentId is optional; provide if you have it on the cell
              instrumentId={rowDataItem.instrumentId}
              score={rowDataItem.score}
              // pass only the params object; Scoring already expects an object here
              scoreParams={{ ...rowDataItem, ...(rowDataItem?.scoringParams ?? {}) }}
            />
          );
        }

        // string answers render directly; everything else is safely stringified
        return typeof rowDataItem === "string" ? rowDataItem : normalize(rowDataItem);
      },
    })),
  ];
}

export function buildReportData({ summaryData = {}, bundle = [] }) {
  let skeleton = report_config;
  skeleton.sections.forEach((section) => {
    const tables = section.tables;
    if (isEmptyArray(tables)) return true;
    tables.forEach((table) => {
      const dataKeysToMatch = table.dataKeysToMatch;
      const paramsByKey = table.paramsByKey ?? {};
      let rows = [];
      let charts = [];
      if (!isEmptyArray(dataKeysToMatch)) {
        const arrDates = dataKeysToMatch.flatMap((key) => {
          const d = summaryData[key];
          if (!d || isEmptyArray(d.chartData?.data)) return [];
          return d.chartData.data.map((o) => o.date);
        });
        const dates = !isEmptyArray(arrDates) ? [...new Set(arrDates)] : [];
        let xDomain = getDateDomain(dates, {
          padding: dates.length <= 2 ? 0.15 : 0.05,
        });
        dataKeysToMatch.forEach((key) => {
          const dataFunc = paramsByKey[key].getProcessedData;
          const processedData = dataFunc ? dataFunc({ summaryData, bundle }) : null;
          const currentData =
            summaryData[key] && summaryData[key].scoringSummaryData
              ? summaryData[key].scoringSummaryData
              : processedData?.scoringSummaryData;
          const chartData =
            summaryData[key] && summaryData[key].chartData ? summaryData[key].chartData : processedData?.chartData;
          if (currentData) {
            rows.push({
              ...(paramsByKey[key].scoringParams ?? {}),
              ...(currentData ?? {}),
            });
          } else {
            if (paramsByKey[key]) {
              rows.push(paramsByKey[key]);
            }
          }
          if (chartData) {
            charts.push({
              ...(chartData?.scoringParams ?? {}),
              xDomain,
              ...(paramsByKey[key].chartParams ?? {}),
              ...(chartData ?? {}),
            });
          }
        });
      }
      table.rows = rows;
      table.charts = charts;
    });
  });
  return skeleton;
}
