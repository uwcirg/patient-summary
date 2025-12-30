import React from "react";
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
  stripHtmlTags,
} from "@util";
import Scoring from "@components/Score";
import Meaning from "@components/Meaning";
import { DEFAULT_ANSWER_OPTIONS } from "@/consts";
import { getDateDomain } from "@/config/chart_config";
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

/** SLUMS (education-aware) */
export function summarizeSLUMHelper(ctx, questionnaireResponses, questionnaire, opts = {}) {
  const conditions = opts.conditions || getResourcesByResourceType(ctx.patientBundle);
  const hasLowerLevelEducation = !isEmptyArray(conditions)
    ? conditions.some((c) =>
        (c?.code?.coding || []).some((cd) => (cd?.code || "").toString().toUpperCase() === "Z55.5"),
      )
    : false;

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);
    const stats = ctx.getScoreStatsFromQuestionnaireResponse(qr, questionnaire, questionnaireConfigs["CIRG_SLUMS"]);

    const { score, totalAnsweredItems, totalItems } = stats;

    const educationLevel = hasLowerLevelEducation ? "low" : "high";
    let scoreSeverity = "low";
    if (score != null) {
      if (educationLevel === "low" && score <= 19) scoreSeverity = "high";
      else if (educationLevel === "high" && score <= 20) scoreSeverity = "high";
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
  { suicideLinkId = "cs-idas-15", maximumScore = 36, highSeverityScoreCutoff = 19 } = {},
) {
  const coalesceNum = (n, fb = 0) => (typeof n === "number" && Number.isFinite(n) ? n : fb);

  const rows = (questionnaireResponses || []).map((qr) => {
    const flat = ctx.flattenResponseItems(qr.item || []);

    const { score, totalAnsweredItems, totalItems } = ctx.getScoreStatsFromQuestionnaireResponse(
      qr,
      questionnaire,
      questionnaireConfigs["CIRG-C-IDAS"],
    );

    const suicideScore = coalesceNum(ctx.getScoringByResponseItem(questionnaire, flat, suicideLinkId), 0);
    const scoreSeverity = score > 18 || suicideScore >= 1 ? "high" : "low";
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
      alertNote: suicideScore >= 1 ? "suicide concern" : null,
      scoringParams: { ...ctx.cfg, maximumScore, scoreSeverity },
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

  if (obs.id) {
    console.warn(`defaultAnswerMapperFromObservation: Unrecognized value type for observation ${obs.id}`, obs);
  }

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

export function observationsToQuestionnaireResponses(observationResources, config = {}) {
  if (isEmptyArray(observationResources)) return [];
  const observations = getValidObservationsForQRs(observationResources);
  /** Group obs by effectiveDateTime (fallback to issued or "unknown") */
  const groupBy = (observations) => {
    const byGroup = new Map();
    for (const o of observations || []) {
      const key = o.effectiveDateTime || o.issued || o.encounter?.reference || "unknown";
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
  if (!isNumber(score)) return "low";
  if (config?.highSeverityScoreCutoff != null && score >= config.highSeverityScoreCutoff) return "high";
  if (config?.mediumSeverityScoreCutoff != null && score >= config.mediumSeverityScoreCutoff) return "moderate";
  const bands = config?.severityBands;
  if (isEmptyArray(bands) || !isNumber(score)) return "low";

  // bands assumed sorted desc by min
  for (const band of bands) {
    if (score >= (band.min ?? 0)) return band.label;
  }
  return bands[bands.length - 1]?.label ?? "low";
}

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

export function getScoringLinkIdFromConfig(config = {}) {
  return normalizeLinkId(config?.scoringQuestionId ? config?.scoringQuestionId : config?.deriveFrom?.linkId);
}

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

  const allAnswered = questionScores.length > 0 && questionScores.every((v) => v != null);

  let score = null,
    rawScore = ctx.getAnswerByResponseLinkId(scoringQuestionId, responseItemsFlat, config);
  if (scoringQuestionScore != null) {
    score = scoringQuestionScore;
  } else if (allAnswered) {
    score = questionScores.reduce((sum, n) => sum + (n ?? 0), 0);
  } else {
    score = rawScore;
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
    rawScore,
    score,
    scoringQuestionScore,
    questionScores,
    scoreLinkIds,
    subScores,
  };
}

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

export function getScoreParamsFromResponses(responses, config = {}) {
  if (isEmptyArray(responses)) return null;
  const current = getMostRecentResponseRow(responses);
  const prev = getPreviousResponseRowWithScore(responses);
  const curScore = current.score != null ? current.score : null;
  const prevScore = prev?.score != null ? prev.score : null;
  const minScore = isNumber(config?.minimumScore) ? config?.minimumScore : 0;
  const maxScore = isNumber(config?.maximumScore) ? config?.maximumScore : null;
  const comparisonToAlert = config?.comparisonToAlert ?? "higher";

  let comparison = null; // "higher" | "lower" | "equal" | null
  if (prevScore != null && curScore != null && isNumber(curScore) && isNumber(prevScore)) {
    if (curScore > prevScore) comparison = "higher";
    else if (curScore < prevScore) comparison = "lower";
    else comparison = "equal";
  }
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
    rawScore: current?.rawScore,
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
  return <span className="no-data-wrapper">No data</span>;
}

export function getResponseColumns(data, config = {}) {
  if (isEmptyArray(data)) return [];

  const dates =
    data?.map((item) => {
      const { key, id, ...rest } = item ?? {};
      return { id: item.id, key: item.key, ...rest };
    }) ?? [];

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
      title: "Questions" + (config?.subtitle ? "\n ( " + getNormalizedRowTitleDisplay(config.subtitle) + " )" : ""),
      field: "question",
      filtering: false,
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
        if (
          typeof q === "string" &&
          (normalizeStr(q).includes("score") ||
            normalizeStr(q).includes("meaning") ||
            normalizeStr(q) === "summary" ||
            normalizeStr(q) === "status" ||
            normalizeStr(q) === normalizeStr(config?.title))
        ) {
          return <b>{q}</b>;
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
      render: (rowData) => {
        const rowDataItem = rowData?.[item.id];
        if (rowData.readOnly) return <span className="text-readonly"></span>;
        if (isNumber(rowDataItem)) return rowDataItem;
        // explicit placeholders prevent React from trying to render objects
        if (!rowDataItem || String(rowDataItem) === "null" || String(rowDataItem) === "undefined") return "—";
        if (rowDataItem.hasMeaningOnly) {
          const { key, ...rest } = rowDataItem;
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
        const contentToRender = typeof rowDataItem === "string" ? stripHtmlTags(rowDataItem) : normalize(rowDataItem);
        // string answers render directly; everything else is safely stringified
        return contentToRender;
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
        rows.push({
          ...(currentData ?? {}),
        });
        if (chartData) {
          charts.push({
            ...(chartData?.scoringParams ?? {}),
            ...(chartData ?? {}),
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
