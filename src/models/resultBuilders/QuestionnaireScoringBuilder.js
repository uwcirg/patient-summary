import { getChartConfig, isEmptyArray, isNil, isNumber, fuzzyMatch, normalizeStr } from "@util";
import FhirResultBuilder from "./FhirResultBuilder";
import { summarizeCIDASHelper, summarizeMiniCogHelper, summarizeSLUMHelper } from "./helpers";
import { DEFAULT_FALLBACK_SCORE_MAPS } from "@/consts";
import { linkIdEquals } from "@/util/fhirUtil";

export default class QuestionnaireScoringBuilder extends FhirResultBuilder {
  /**
   * @param {Object} config
   * @param {string} config.questionnaireId
   * @param {string} config.questionnaireName
   * @param {string} config.questionnaireUrl
   * @param {string|null} config.scoringQuestionId
   * @param {Object} [config.scoringParams]        // e.g., { maximumScore: 27 }
   * @param {string[]} [config.questionLinkIds]    // optional; derive from Questionnaire if omitted
   * @param {'strict'|'fuzzy'} [config.matchMode]  // default 'fuzzy'
   * @param {{min:number,label:string,meaning?:string}[]} [config.severityBands]
   * @param {number} [config.highSeverityScoreCutoff]
   * @param {Object|Array} patientBundle           // FHIR Bundle or array of resources
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
      questionLinkIds: Array.isArray(config.questionLinkIds) ? config.questionLinkIds : null,
      matchMode: config.matchMode ?? "fuzzy",
      severityBands: bands,
      highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? bands?.[0]?.min ?? null,
    };

    this.patientBundle = patientBundle || null;
    this.responseAnswerTypes = new Set([
      "boolean",
      "decimal",
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

  // -------------------- Bundle access (supports override) --------------------
  _bundleEntries(bundleOverride) {
    const b = bundleOverride || this.patientBundle;
    if (!b) return [];
    // tolerate arrays of resources OR a proper Bundle
    if (!isEmptyArray(b) && b.find((x) => x?.resource || x?.resourceType)) {
      return b.map((x) => (x?.resource ? x.resource : x));
    }
    if (!isEmptyArray(b?.entry)) return b.entry.map((e) => e.resource).filter(Boolean);
    return [];
  }

  // Extract QRs (QuestionnaireResponse)
  fromBundle(bundleOverride) {
    const entries = this._bundleEntries(bundleOverride);
    return entries.filter((r) => r && String(r.resourceType).toLowerCase() === "questionnaireresponse");
  }

  // Group QRs by `questionnaire` canonical
  fromBundleGrouped({ completedOnly = true } = {}, bundleOverride) {
    const groups = Object.create(null);
    const entries = this._bundleEntries(bundleOverride);

    for (let i = 0; i < entries.length; i++) {
      const res = entries[i];
      if (!res || String(res.resourceType).toLowerCase() !== "questionnaireresponse") continue;
      if (completedOnly && res.status !== "completed") continue;

      const key = (res.questionnaire ?? "").toString();
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(res);
    }

    // newest-first within each group (authored -> meta.lastUpdated)
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

  // Get QRs matching this builder's questionnaire config
  fromBundleForThisQuestionnaire({ completedOnly = true } = {}, bundleOverride) {
    const groups = this.fromBundleGrouped({ completedOnly }, bundleOverride);
    const out = [];

    // Try direct canonical match first
    for (const canonical of Object.keys(groups)) {
      if (this.questionnaireRefMatches(canonical)) out.push(...groups[canonical]);
    }

    // Fallback: scan all with fuzzy/strict rules
    if (!out.length) {
      for (const canonical of Object.keys(groups)) {
        for (const qr of groups[canonical] || []) {
          if (this.questionnaireRefMatches(qr.questionnaire || "")) out.push(qr);
        }
      }
    }

    // Ensure combined list is sorted
    return this.sortByNewestAuthoredOrUpdated(
      out.map((qr) => ({ authoredDate: qr.authored ?? null, lastUpdated: qr.meta?.lastUpdated ?? null, _qr: qr })),
    ).map((x) => x._qr);
  }

  /**
   * Index Questionnaire defs found in bundle.
   * Keys: canonical url | "Questionnaire/<id>" | normalized name
   */
  indexQuestionnairesInBundle(bundleOverride) {
    const idx = Object.create(null);
    const entries = this._bundleEntries(bundleOverride);
    for (let i = 0; i < entries.length; i++) {
      const q = entries[i];
      if (!q || q.resourceType !== "Questionnaire") continue;

      if (q.id) idx[`Questionnaire/${q.id}`] = q;
      if (q.name) idx[normalizeStr(q.name)] = q;
      if (q.url) idx[q.url] = q;
    }
    return idx;
  }

  resolveQuestionnaireFromIndex(canonical, qIndex) {
    if (!canonical) return null;
    if (qIndex[canonical]) return qIndex[canonical];

    const byName = normalizeStr(canonical);
    if (byName && qIndex[byName]) return qIndex[byName];

    if (!canonical.includes("/") && qIndex[`Questionnaire/${canonical}`]) {
      return qIndex[`Questionnaire/${canonical}`];
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
    if (item.linkId === "introduction") return false;
    if (String(item.linkId).toLowerCase().includes("ignore")) return false;
    if (!this.responseAnswerTypes.has(item.type)) {
      return false;
    }
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
    return (url && fuzzyMatch(ref, url)) || (id && fuzzyMatch(ref, id)) || (name && fuzzyMatch(ref, name));
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
    if (!ans) return null;
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
    if (!isNil(prim)) return prim;

    const coding = this.answerCoding(ans);
    if (coding?.code) {
      const fromExt = this.getAnswerValueByExtension(questionnaire, coding.code);
      if (fromExt != null) return fromExt;
      if (this.fallbackScoreMap[coding.code] != null) return this.fallbackScoreMap[coding.code];
      return null;
    }

    return null;
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
      const coding = this.answerCoding(ans);
      const primitive = this.answerPrimitive(ans);
      const value = coding ? (coding.display ?? coding.code ?? null) : primitive;

      return {
        id: q.linkId,
        answer: value ?? null,
        question: q.linkId === this.cfg.scoringQuestionId ? `<b>${q.text}</b>` : q.text,
        text: resp?.text ? resp?.text : q.text,
        type: q.type
      };
    });
  }

  responsesOnly(responseItemsFlat = []) {
    return (responseItemsFlat || []).map((item) => {
      const ans = this.firstAnswer(item);
      const coding = this.answerCoding(ans);
      const primitive = this.answerPrimitive(ans);
      const value = coding ? (coding.display ?? coding.code ?? null) : primitive;
      return { id: item.linkId, answer: value ?? null, question: item.text, text: item.text };
    });
  }

  // -------------------- severity --------------------
  severityFromScore(score) {
    const bands = this.cfg.severityBands;
    if (!bands || !bands.length || typeof score !== "number") return "low";

    // Assumes bands sorted by min descending, e.g. [{min:3,label:'low'},{min:0,label:'high'}]
    for (const band of bands) {
      if (score >= (band.min ?? 0)) return band.label;
    }
    // Fallback to the last band's label
    return bands[bands.length - 1]?.label ?? "low";
  }
  meaningFromSeverity(sev) {
    const bands = this.cfg.severityBands;
    if (!isEmptyArray(bands)) return bands.find((b) => b.label === sev)?.meaning ?? null;
    return null;
  }

  // -------------------- public APIs --------------------
  getResponsesSummary(questionnaireResponses, questionnaire) {
    const scoreLinkIds = this.cfg.questionLinkIds?.length
      ? this.cfg.questionLinkIds
      : this.getAnswerLinkIdsByQuestionnaire(questionnaire);

    const rows = (questionnaireResponses || []).map((qr) => {
      const flat = this.flattenResponseItems(qr.item);
      const nonScoring =
        flat.length === 1
          ? flat
          : flat.filter(
              (it) => !this.cfg.scoringQuestionId || !this.isLinkIdEquals(it.linkId, this.cfg.scoringQuestionId),
            );

      const totalItems = this.cfg.questionLinkIds?.length
        ? this.cfg.questionLinkIds.length
        : this.getAnswerLinkIdsByQuestionnaire(questionnaire).length;

      const totalAnsweredItems = Math.min(nonScoring.filter((it) => this.firstAnswer(it) != null).length, totalItems);

      const scoringQuestionScore = this.cfg.scoringQuestionId
        ? this.getScoringByResponseItem(questionnaire, flat, this.cfg.scoringQuestionId)
        : null;

      const questionScores = scoreLinkIds.map((id) => this.getScoringByResponseItem(questionnaire, flat, id));
      const allAnswered = questionScores.length > 0 && questionScores.every((v) => v != null);

      let score = null;
      if (scoringQuestionScore != null) score = scoringQuestionScore;
      else if (nonScoring.length > 0 && allAnswered) score = questionScores.reduce((sum, n) => sum + (n ?? 0), 0);

      const scoreSeverity = this.severityFromScore(score);

      let responses = this.formattedResponses(questionnaire?.item ?? [], flat);
      if (isEmptyArray(responses)) responses = this.responsesOnly(flat);

      return {
        id: qr.id,
        date: this.dateTimeText(qr.authored),
        responses,
        scoringQuestionScore,
        score,
        scoreSeverity,
        highSeverityScoreCutoff: this.cfg.highSeverityScoreCutoff,
        scoreMeaning: this.meaningFromSeverity(scoreSeverity),
        scoringParams: this.cfg.scoringParams,
        totalItems,
        totalAnsweredItems,
        authoredDate: qr.authored,
        lastUpdated: qr.meta?.lastUpdated,
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
    const map = {
      SLUM: "summarizeSLUM",
      CIDAS: "summarizeCIDAS",
      MINICOG: "summarizeMiniCog",
    };
    const key = Object.keys(map).find((k) => this.questionnaireRefMatches(k));
    const evalData = key ? this[map[key]](qrs, questionnaire, options) : this.getResponsesSummary(qrs, questionnaire);
    const scoringData = !isEmptyArray(evalData)
      ? evalData.filter((item) => {
          return item && !isEmptyArray(item.responses) && isNumber(item.score) && item.date;
        })
      : null;
    const chartData = !isEmptyArray(scoringData)
      ? scoringData.map((item) => ({
          ...item,
          ...(item.scoringParams ?? {}),
          date: item.date,
          total: item.score,
        }))
      : null;
    const config = questionnaire.summaryConfig;
    const scoringParams = config?.scoringParams;

    return {
      config: config,
      chartConfig: { ...getChartConfig(questionnaire?.id), ...scoringParams },
      chartData: chartData,
      scoringData: scoringData,
      responses: evalData,
      questionnaire: questionnaire,
    };
  }

  // -------------------- Sync APIs (supporting bundle override) --------------------
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
      if (!isEmptyArray(summaries)) out[canonical] = summaries;
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

  // -------------------- Async APIs (supporting bundle override) --------------------
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
      if (summaries && summaries.length) out[canonical] = summaries;
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
