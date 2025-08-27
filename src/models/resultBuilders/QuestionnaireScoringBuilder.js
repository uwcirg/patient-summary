import {
  getChartConfig,
  getLocaleDateStringFromDate,
  isEmptyArray,
  isNumber,
  isPlainObject,
  fuzzyMatch,
  normalizeStr,
  objectToString,
  toFiniteNumber
} from "@util";
import Response from "@models/Response";
import FhirResultBuilder from "./FhirResultBuilder";
import { summarizeCIDASHelper, summarizeMiniCogHelper, summarizeSLUMHelper } from "./helpers";
import { DEFAULT_FALLBACK_SCORE_MAPS } from "@/consts";
import questionnaireConfig from "@/config/questionnaire_config";
import { linkIdEquals } from "@/util/fhirUtil";

const RT_QR = "questionnaireresponse";
const RT_Q = "Questionnaire";

const isQr = (res) => res && String(res.resourceType).toLowerCase() === RT_QR;

export default class QuestionnaireScoringBuilder extends FhirResultBuilder {
  /**
   * @param {Object} config
   * @param {string} config.questionnaireId
   * @param {string} config.questionnaireName
   * @param {string} config.questionnaireUrl
   * @param {string|null} config.scoringQuestionId
   * @param {Object} [config.scoringParams]
   * @param {string[]} [config.questionLinkIds]
   * @param {'strict'|'fuzzy'} [config.matchMode]
   * @param {{min:number,label:string,meaning?:string}[]} [config.severityBands]
   * @param {number} [config.highSeverityScoreCutoff]
   * @param {Object|Array} patientBundle
   */
  constructor(config = {}, patientBundle) {
    super();

    const bands = !isEmptyArray(config?.severityBands) ? [...config.severityBands] : null;
    if (bands) bands.sort((a, b) => (b.min ?? 0) - (a.min ?? 0));

    this.fallbackScoreMap = config?.fallbackScoreMap || DEFAULT_FALLBACK_SCORE_MAPS.default;

    this.cfg = {
      questionnaireId: config.questionnaireId ?? "",
      questionnaireName: config.questionnaireName ?? "",
      questionnaireUrl: config.questionnaireUrl ?? "",
      scoringQuestionId: config.scoringQuestionId ?? "",
      scoringParams: config.scoringParams ?? {},
      questionLinkIds: !isEmptyArray(config.questionLinkIds) ? config.questionLinkIds : null,
      matchMode: config.matchMode ?? "fuzzy",
      severityBands: bands,
      highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? bands?.[0]?.min ?? null,
    };

    this.patientBundle = patientBundle || null;
    this.responseAnswerTypes = new Set([
      "boolean",
      "decimal",
      "coding",
      "integer",
      "date",
      "dateTime",
      "time",
      "string",
      "text",
      "choice",
      "open-choice",
    ]);
  }

  // -------------------- Bundle access --------------------
  _bundleEntries(bundleOverride) {
    const b = bundleOverride || this.patientBundle;
    if (!b) return [];
    // Array of {resource} entries OR bare resources
    if (Array.isArray(b)) {
      return b.map((x) => (x && x.resource ? x.resource : x)).filter((r) => r && r.resourceType);
    }
    // Proper Bundle
    if (!isEmptyArray(b?.entry)) return b.entry.map((e) => e.resource).filter(Boolean);
    return [];
  }

  fromBundle(bundleOverride) {
    const entries = this._bundleEntries(bundleOverride);
    return entries.filter(isQr);
  }

  fromBundleGrouped({ completedOnly = true } = {}, bundleOverride) {
    const groups = Object.create(null);
    for (const res of this._bundleEntries(bundleOverride)) {
      if (!isQr(res)) continue;
      if (completedOnly && res.status !== "completed") continue;

      let key = (res.questionnaire ?? "").toString();
      // Keep canonical URLs intact; normalize "Questionnaire/<id>" to "<id>"
      if (/^Questionnaire\//i.test(key)) key = key.split("/")[1] || "";
      if (!key) continue;

      (groups[key] || (groups[key] = [])).push(res);
    }

    // newest-first within each group
    for (const k of Object.keys(groups)) {
      const list = groups[k].map((qr) => ({
        authoredDate: qr.authored ?? null,
        lastUpdated: qr.meta?.lastUpdated ?? null,
        _qr: qr,
      }));
      groups[k] = this.sortByNewestAuthoredOrUpdated(list).map((x) => x._qr);
    }
    return groups;
  }

  fromBundleForThisQuestionnaire({ completedOnly = true } = {}, bundleOverride) {
    const groups = this.fromBundleGrouped({ completedOnly }, bundleOverride);
    const out = [];

    // Direct (canonical/id/name) match against group keys
    for (const canonical of Object.keys(groups)) {
      if (this.questionnaireRefMatches(canonical)) out.push(...groups[canonical]);
    }

    // Fallback: scan individual QRs if none matched by key
    if (!out.length) {
      for (const canonical of Object.keys(groups)) {
        for (const qr of groups[canonical] || []) {
          if (this.questionnaireRefMatches(qr.questionnaire || "")) out.push(qr);
        }
      }
    }

    return this.sortByNewestAuthoredOrUpdated(
      out.map((qr) => ({ authoredDate: qr.authored ?? null, lastUpdated: qr.meta?.lastUpdated ?? null, _qr: qr })),
    ).map((x) => x._qr);
  }

  // -------------------- Questionnaire indexing --------------------
  indexQuestionnairesInBundle(bundleOverride) {
    const idx = Object.create(null);
    for (const q of this._bundleEntries(bundleOverride)) {
      if (!q || q.resourceType !== RT_Q) continue;
      if (q.id) idx[q.id] = q;
      if (q.name) idx[normalizeStr(q.name)] = q;
      if (q.url) idx[q.url] = q;
    }
    return idx;
  }

  resolveQuestionnaireFromIndex(canonical, qIndex) {
    if (!canonical) return null;
    // Normalize common reference forms like "Questionnaire/<id>"
    let c = String(canonical);
    if (/^Questionnaire\//i.test(c)) c = c.split("/")[1] || "";
    if (!c) return null;
    if (qIndex[c]) return qIndex[c];
    const byName = normalizeStr(c);
    if (byName && qIndex[byName]) return qIndex[byName];
    if (!c.includes("/") && qIndex[c]) {
      return qIndex[canonical];
    }
    return null;
  }

  makeBundleQuestionnaireLoader(bundleOverride) {
    const qIndex = this.indexQuestionnairesInBundle(bundleOverride);
    return (canonical) => this.resolveQuestionnaireFromIndex(canonical, qIndex);
  }

  // -------------------- general utils --------------------
  dateTimeText(fhirDateTime) {
    return fhirDateTime ?? null;
  }
  isLinkIdEquals(a, b) {
    return linkIdEquals(a, b, this.cfg.matchMode ?? "fuzzy");
  }
  isResponseQuestionItem(item) {
    if (!item || !item.linkId) return false;
    const linkId = String(item.linkId).toLowerCase();
    if (linkId === "introduction" || linkId.includes("ignore")) return false;
    if (!this.responseAnswerTypes.has(item.type)) return false;
    if (this.cfg.scoringQuestionId) {
      return !this.isLinkIdEquals(item.linkId, this.cfg.scoringQuestionId);
    }
    return true;
  }

  // -------------------- Questionnaire matching --------------------
  questionnaireRefMatches(canonical) {
    const ref = normalizeStr(canonical);
    const id = normalizeStr(this.cfg.questionnaireId);
    const name = normalizeStr(this.cfg.questionnaireName);
    const url = normalizeStr(this.cfg.questionnaireUrl);

    if ((this.cfg.matchMode ?? "fuzzy") === "strict") {
      return (url && ref === url) || (id && ref === id) || (name && ref === name);
    }
    return (id && fuzzyMatch(ref, id)) || (name && fuzzyMatch(ref, name)) || (url && fuzzyMatch(ref, url));
  }

  matchedResponsesByQuestionnaire(responses) {
    const rows = (responses || [])
      .filter((resp) => resp?.status === "completed" && this.questionnaireRefMatches(resp.questionnaire || ""))
      .map((resp) => ({
        authoredDate: resp.authored ?? null,
        lastUpdated: resp.meta?.lastUpdated ?? null,
        _resp: resp,
      }));
    return this.sortByNewestAuthoredOrUpdated(rows).map((r) => r._resp);
  }

  // -------------------- QR item helpers --------------------
  flattenResponseItems(items = []) {
    const out = [];
    const walk = (arr) => {
      for (const it of arr || []) {
        out.push(it);
        if (!isEmptyArray(it.item)) walk(it.item);
        for (const ans of it.answer || []) {
          if (!isEmptyArray(ans.item)) walk(ans.item);
        }
      }
    };
    walk(items);
    return out;
  }
  firstAnswer(item) {
    return item?.answer?.[0] ?? null;
  }
  findResponseItemByLinkId(flatItems, linkId) {
    return (flatItems || []).find((i) => this.isLinkIdEquals(i.linkId, linkId)) ?? null;
  }

  // -------------------- answer readers (value[x]) --------------------
  answerCoding(ans) {
    const c = ans?.valueCoding;
    return c ? { code: c.code ?? null, display: c.display ?? null } : null;
  }
  answerPrimitive(ans) {
    if (!isPlainObject(ans)) return null;
    if ("valueBoolean" in ans) return ans.valueBoolean;
    if ("valueInteger" in ans) return ans.valueInteger;
    if ("valueDecimal" in ans) return ans.valueDecimal;
    if ("valueString" in ans) return ans.valueString;
    if ("valueDate" in ans) return ans.valueDate;
    if ("valueDateTime" in ans) return ans.valueDateTime;
    if ("valueTime" in ans) return ans.valueTime;
    if ("valueUri" in ans) return ans.valueUri;
    if ("valueQuantity" in ans) return ans.valueQuantity?.value ?? null;
    if ("valueReference" in ans) return ans.valueReference?.reference ?? null;
    return null;
  }

  // -------------------- Questionnaire helpers --------------------
  getAnswerLinkIdsByQuestionnaire(questionnaire) {
    const out = [];
    const walk = (items = []) => {
      for (const it of items) {
        if (it.linkId && it.type && this.isResponseQuestionItem(it)) out.push(it.linkId);
        if (!isEmptyArray(it.item)) walk(it.item);
      }
    };
    walk(questionnaire?.item || []);
    return out;
  }

  getAnswerValueByExtension(questionnaire, code) {
    if (!questionnaire?.item) return null;
    let found = null;
    const readOrdinalExt = (opt) => {
      const ext = (opt.extension || []).find((e) => e.url === "http://hl7.org/fhir/StructureDefinition/ordinalValue");
      const v = ext?.valueInteger ?? ext?.valueDecimal ?? null;
      return v == null ? null : Number(v);
    };
    const walk = (items = []) => {
      for (const it of items) {
        for (const opt of it.answerOption || []) {
          const c = opt.valueCoding;
          if (c?.code === code) {
            const fromExt = readOrdinalExt(opt);
            if (fromExt != null) {
              found = fromExt;
              return;
            }
          }
          if (!c && (opt.valueInteger != null || opt.valueDecimal != null)) {
            const v = opt.valueInteger ?? opt.valueDecimal;
            if (found == null) found = Number(v);
          }
        }
        if (found == null && !isEmptyArray(it.item)) walk(it.item);
        if (found != null) return;
      }
    };
    walk(questionnaire.item);
    return found;
  }

  // -------------------- scoring --------------------
  getScoringByResponseItem(questionnaire, responseItemsFlat, linkId) {
    const it = this.findResponseItemByLinkId(responseItemsFlat, linkId);
    const ans = this.firstAnswer(it);
    if (!ans) return null;

    const prim = this.answerPrimitive(ans);
    const primNum = toFiniteNumber(prim);
    if (primNum != null) return primNum;

    const coding = this.answerCoding(ans);
    if (coding?.code) {
      const fromExt = this.getAnswerValueByExtension(questionnaire, coding.code);
      if (fromExt != null) return fromExt;
      if (this.fallbackScoreMap[coding.code] != null) return this.fallbackScoreMap[coding.code];
    }
    return null;
  }

  getAnswerItemDisplayValue(answerItem) {
    if (!answerItem) return null;
    // Prefer human display
    const coding = this.answerCoding(answerItem);
    if (coding) return coding.display ?? this.fallbackScoreMap[coding.code] ?? null;

    const prim = this.answerPrimitive(answerItem);
    const primNum = toFiniteNumber(prim);
    if (primNum != null) return primNum;
    return prim ?? objectToString(answerItem);
  }

  // -------------------- formatting --------------------
  formattedResponses(questionnaireItems, responseItemsFlat) {
    if (isEmptyArray(questionnaireItems)) return this.responsesOnly(responseItemsFlat);

    const list = [];
    const walk = (items = []) => {
      for (const q of items) {
        if (q.linkId && this.isResponseQuestionItem(q)) list.push(q);
        if (q.item?.length) walk(q.item);
      }
    };
    walk(questionnaireItems);

    return list.map((q) => {
      const resp = this.findResponseItemByLinkId(responseItemsFlat, q.linkId);
      const ans = this.firstAnswer(resp);
      return {
        id: q.linkId,
        answer: this.getAnswerItemDisplayValue(ans),
        question: q.linkId === this.cfg.scoringQuestionId ? `<b>${q.text}</b>` : q.text,
        text: resp?.text ? resp?.text : q.text,
        type: q.type,
      };
    });
  }

  responsesOnly(responseItemsFlat = []) {
    return (responseItemsFlat || []).map((item) => {
      const ans = this.firstAnswer(item);
      return {
        id: item.linkId,
        answer: this.getAnswerItemDisplayValue(ans) ?? null,
        question: item.text,
        text: item.text,
      };
    });
  }

  // -------------------- severity --------------------
  severityFromScore(score, configParams) {
    const config = configParams ?? this.cfg;
    const bands = config?.severityBands;
    if (isEmptyArray(bands) || !isNumber(score)) return "low";

    // bands assumed sorted desc by min
    for (const band of bands) {
      if (score >= (band.min ?? 0)) return band.label;
    }
    return bands[bands.length - 1]?.label ?? "low";
  }
  meaningFromSeverity(sev, configParams) {
    const config = configParams ?? this.cfg;
    const bands = config?.severityBands;
    if (!isEmptyArray(bands)) return bands.find((b) => b.label === sev)?.meaning ?? null;
    return null;
  }

  // -------------------- public APIs --------------------
  getResponsesSummary(questionnaireResponses, questionnaire) {
    const config = this.cfg && this.cfg.questionnaireId ? this.cfg : questionnaireConfig[questionnaire?.id];
    const scoreLinkIds = config?.questionLinkIds?.length
      ? config.questionLinkIds
      : this.getAnswerLinkIdsByQuestionnaire(questionnaire);

    const scoringQuestionId = config?.scoringQuestionId;

    const rows = (questionnaireResponses || []).map((qr) => {
      const flat = this.flattenResponseItems(qr.item);

      const nonScoring =
        flat.length === 1
          ? flat
          : flat.filter((it) => !scoringQuestionId || !this.isLinkIdEquals(it.linkId, scoringQuestionId));

      const totalItems = scoreLinkIds?.length
        ? scoreLinkIds.length
        : this.getAnswerLinkIdsByQuestionnaire(questionnaire).length;

      const totalAnsweredItems = Math.min(nonScoring.filter((it) => this.firstAnswer(it) != null).length, totalItems);

      const scoringQuestionScore = scoringQuestionId
        ? this.getScoringByResponseItem(questionnaire, flat, scoringQuestionId)
        : null;

      const questionScores = scoreLinkIds.map((id) => this.getScoringByResponseItem(questionnaire, flat, id));
      const allAnswered = questionScores.length > 0 && questionScores.every((v) => v != null);

      let score = null;
      if (scoringQuestionScore != null) score = scoringQuestionScore;
      else if (nonScoring.length > 0 && allAnswered) {
        score = questionScores.reduce((sum, n) => sum + (n ?? 0), 0);
      }

      const scoreSeverity = this.severityFromScore(score, config);
      let responses = this.formattedResponses(questionnaire?.item ?? [], flat);
      if (isEmptyArray(responses)) responses = this.responsesOnly(flat);

      return {
        ...(config ?? {}),
        id: qr.id,
        date: this.dateTimeText(qr.authored),
        responses,
        scoringQuestionScore,
        score,
        scoreSeverity,
        highSeverityScoreCutoff: config?.highSeverityScoreCutoff,
        scoreMeaning: this.meaningFromSeverity(scoreSeverity, config),
        scoringParams: config?.scoringParams,
        totalItems,
        totalAnsweredItems,
        authoredDate: qr.authored,
        lastUpdated: qr.meta?.lastUpdated,
        config: config,
      };
    });

    return this.sortByNewestAuthoredOrUpdated(rows);
  }

  getResponsesOnly(questionnaireResponses, questionnaire) {
    return (questionnaireResponses || []).map((qr) => {
      const flat = this.flattenResponseItems(qr.item);
      return this.formattedResponses(questionnaire?.item ?? [], flat);
    });
  }

  // -------------------- Loader plumbing (bundle-aware) --------------------
  _isPromise(x) {
    return !!x && typeof x.then === "function";
  }
  _getAnswer(response) {
    const o = new Response(response);
    return o.answerText ? o.answerText : "--";
  }
  _getQuestion(item) {
    const o = new Response(item);
    return o.questionText;
  }
  _hasResponseData(data) {
    return !isEmptyArray(data) && !!data.find((item) => !isEmptyArray(item.responses));
  }
  _hasScoreData(data) {
    return !isEmptyArray(data) && !!data.find((item) => isNumber(item.score));
  }

  _getMatchedAnswerByLinkIdDateId(data, question_linkId, responses_date, responses_id) {
    const matchItem = (data || []).find((item) => item.id === responses_id && item.date === responses_date);
    if (!matchItem || isEmptyArray(matchItem.responses)) return "--";
    const answerItem = matchItem.responses.find((o) => o.id === question_linkId);
    return answerItem ? this._getAnswer(answerItem) : "--";
  }

  _formatTableResponseData = (data) => {
    if (!this._hasResponseData(data)) return null;

    const dates = data.map((item) => ({ date: item.date, id: item.id }));

    // Use the row with max responses as the “schema”
    const anchorRowData = [...data].sort((a, b) => (b.responses?.length || 0) - (a.responses?.length || 0))[0];
    if (!anchorRowData || isEmptyArray(anchorRowData.responses)) return null;

    // Build a set of all question ids
    const qIds = new Set(anchorRowData.responses.map((r) => r.id));
    for (const d of data) {
      for (const r of d.responses || []) qIds.add(r.id);
    }

    const result = [...qIds].map((qid) => {
      const row = {};
      // Question text from first available response carrying that qid
      const sample =
        (anchorRowData.responses || []).find((r) => r.id === qid) ||
        (data.find((d) => (d.responses || []).some((r) => r.id === qid))?.responses || []).find((r) => r.id === qid);
      row.question = sample ? this._getQuestion(sample) : qid;
      for (const d of dates) {
        row[d.id] = this._getMatchedAnswerByLinkIdDateId(data, qid, d.date, d.id);
      }
      return row;
    });

    if (this._hasScoreData(data)) {
      const scoringRow = { question: "Score" };
      for (const item of data) scoringRow[item.id] = { score: item.score, ...item };
      result.push(scoringRow);
    }
    return result;
  };

  _formatPrintResponseData(data, params) {
    if (!this._hasResponseData(data)) return null;

    // Current implementation prints only the first column/date
    const first = data[0];
    const headerRow = ["Questions", getLocaleDateStringFromDate(first.date)];
    const bodyRows = (first.responses || []).map((row) => [
      this._getQuestion(row),
      this._getMatchedAnswerByLinkIdDateId(data, row.id, first.date, first.id),
    ]);
    const scoreRow = this._hasScoreData(data) ? [{ score: first.score, scoreParams: params }] : null;

    return { headerRow, bodyRows, scoreRow };
  }

  async _loadQuestionnaire(canonical, questionnaireLoader, bundleOverride) {
    if (questionnaireLoader) {
      const maybe = questionnaireLoader(canonical);
      return this._isPromise(maybe) ? await maybe : maybe;
    }
    const loader = this.makeBundleQuestionnaireLoader(bundleOverride);
    return loader(canonical) || null;
  }

  summarizeSLUM(qrs, questionnaire, opts = {}) {
    return summarizeSLUMHelper(this, qrs, questionnaire, opts);
  }
  summarizeCIDAS(qrs, questionnaire, opts = {}) {
    return summarizeCIDASHelper(this, qrs, questionnaire, opts);
  }
  summarizeMiniCog(qrs, questionnaire, opts = {}) {
    return summarizeMiniCogHelper(this, qrs, questionnaire, opts);
  }

  _summariesByQuestionnaireRef(qrs, questionnaire, options = {}) {
    const config = questionnaireConfig[questionnaire?.id] ?? this.cfg;

    const strategyMap = {
      SLUM: "summarizeSLUM",
      CIDAS: "summarizeCIDAS",
      MINICOG: "summarizeMiniCog",
    };
    const selectedKey = Object.keys(strategyMap).find((k) => this.questionnaireRefMatches(k));
    const evalData = selectedKey
      ? this[strategyMap[selectedKey]](qrs, questionnaire, options)
      : this.getResponsesSummary(qrs, questionnaire);

    const scoringData = !isEmptyArray(evalData)
      ? evalData.filter((item) => item && !isEmptyArray(item.responses) && isNumber(item.score) && item.date)
      : null;

    const chartConfig = getChartConfig(questionnaire?.id);
    let chartData = !isEmptyArray(scoringData)
      ? scoringData.map((item) => ({
          ...item,
          ...(item.scoringParams ?? {}),
          date: item.date,
          total: item.score,
        }))
      : null;

    if (chartData && chartConfig?.dataFormatter) {
      chartData = chartConfig.dataFormatter(chartData);
    }

    const scoringParams = config?.scoringParams;

    return {
      config: config,
      chartConfig: { ...chartConfig, ...scoringParams },
      chartData: { ...chartConfig, data: chartData },
      chartType: chartConfig?.type,
      scoringData: scoringData,
      responseData: evalData,
      tableResponseData: this._formatTableResponseData(evalData),
      printResponseData: this._formatPrintResponseData(evalData, config),
      questionnaire: questionnaire,
    };
  }

  // -------------------- Sync APIs --------------------
  summariesByQuestionnaireFromBundle(
    questionnaireLoader,
    { strategyOptions = {}, completedOnly = true } = {},
    bundleOverride,
  ) {
    const groups = this.fromBundleGrouped({ completedOnly }, bundleOverride);
    const loader = questionnaireLoader || this.makeBundleQuestionnaireLoader(bundleOverride);

    const out = Object.create(null);
    for (const canonical of Object.keys(groups)) {
      const qrs = groups[canonical];
      const questionnaire = loader(canonical);
      if (!questionnaire) continue;
      const summaries = this._summariesByQuestionnaireRef(qrs, questionnaire, strategyOptions);
      if (!isEmptyArray(summaries?.responseData)) out[canonical] = summaries;
    }
    return out;
  }

  summariesFromBundle(
    questionnaire /* optional */,
    { strategyOptions = {}, completedOnly = true } = {},
    bundleOverride,
  ) {
    const qrs = this.fromBundleForThisQuestionnaire({ completedOnly }, bundleOverride);
    if (!qrs.length) return [];

    let q = questionnaire;
    if (!q) {
      const loader = this.makeBundleQuestionnaireLoader(bundleOverride);
      q = loader(qrs[0].questionnaire || "") || null;
      if (!q) return [];
    }
    return this._summariesByQuestionnaireRef(qrs, q, strategyOptions);
  }

  // -------------------- Async APIs --------------------
  async summariesByQuestionnaireFromBundleAsync(
    questionnaireLoader,
    { strategyOptions = {}, completedOnly = true } = {},
    bundleOverride,
  ) {
    const groups = this.fromBundleGrouped({ completedOnly }, bundleOverride);
    const out = Object.create(null);
    const canonicals = Object.keys(groups);

    const defs = await Promise.all(
      canonicals.map((canonical) =>
        this._loadQuestionnaire(
          canonical,
          questionnaireLoader || this.makeBundleQuestionnaireLoader(bundleOverride),
          bundleOverride,
        ),
      ),
    );

    for (let i = 0; i < canonicals.length; i++) {
      const canonical = canonicals[i];
      const qrs = groups[canonical];
      const questionnaire = defs[i];
      if (!questionnaire) continue;

      const summaries = this._summariesByQuestionnaireRef(qrs, questionnaire, strategyOptions);
      if (!isEmptyArray(summaries?.responseData)) out[canonical] = summaries;
    }
    return out;
  }

  async summariesFromBundleAsync(
    questionnaire /* optional */,
    { strategyOptions = {}, completedOnly = true } = {},
    bundleOverride,
  ) {
    const qrs = this.fromBundleForThisQuestionnaire({ completedOnly }, bundleOverride);
    if (!qrs.length) return [];

    let q = questionnaire;
    if (!q) {
      const canonical = qrs[0]?.questionnaire || "";
      q = await this._loadQuestionnaire(canonical, this.makeBundleQuestionnaireLoader(bundleOverride), bundleOverride);
      if (!q) return [];
    }
    return this._summariesByQuestionnaireRef(qrs, q, strategyOptions);
  }
}
