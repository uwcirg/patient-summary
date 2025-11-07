import {
  firstNonEmpty,
  getChartConfig,
  getLocaleDateStringFromDate,
  isEmptyArray,
  isNil,
  isNonEmptyString,
  isNumber,
  isPlainObject,
  fuzzyMatch,
  mergeNonEmpty,
  normalizeStr,
  objectToString,
  toFiniteNumber,
} from "@util";
import Response from "@models/Response";
import FhirResultBuilder from "./FhirResultBuilder";
import {
  buildQuestionnaire,
  getScoreParamsFromResponses,
  summarizeCIDASHelper,
  summarizeMiniCogHelper,
  summarizeSLUMHelper,
} from "./helpers";
import { DEFAULT_FALLBACK_SCORE_MAPS, DEFAULT_VAL_TO_LOIN_CODE } from "@/consts";
import questionnaireConfig from "@/config/questionnaire_config";
import { conceptText, getQuestionnaireItemByLinkId, linkIdEquals, normalizeLinkId } from "@/util/fhirUtil";
import { getDateDomain } from "@/config/chart_config";

const RT_QR = "questionnaireresponse";
const RT_Q = "Questionnaire";

const isQr = (res) => res && String(res.resourceType).toLowerCase() === RT_QR;

export default class QuestionnaireScoringBuilder extends FhirResultBuilder {
  /**
   * @param {Object} config
   * @param {string} config.key
   * @param {string} config.title
   * @param {string} config.questionnaireId
   * @param {string} config.questionnaireName
   * @param {string} config.questionnaireUrl
   * @param {string|null} config.scoringQuestionId
   * @param {Object} [config.scoringParams]
   * @param {string[]} [config.questionLinkIds]
   * @param {string[]}[config.subScoringQuestionIds]
   * @param {'strict'|'fuzzy'} [config.matchMode]
   * @param {number} config.highSeverityScoreCutoff
   * @param {{min:number,label:string,meaning?:string}[]} [config.severityBands]
   * @param {Object|Array} patientBundle
   */
  constructor(config = {}, patientBundle) {
    super();

    const bands = !isEmptyArray(config?.severityBands) ? [...config.severityBands] : null;
    if (bands) bands.sort((a, b) => (b.min ?? 0) - (a.min ?? 0));

    const rawFallback = config?.fallbackScoreMap ?? DEFAULT_FALLBACK_SCORE_MAPS.default;
    this.fallbackScoreMap = Object.fromEntries(
      Object.entries(rawFallback).map(([k, v]) => [String(k).toLowerCase(), v]),
    );

    // normalize linkIds from config once
    const norm = (id) => (id == null ? id : normalizeLinkId(String(id)));
    const normArr = (arr) => (isEmptyArray(arr) ? null : arr.map(norm));

    this.cfg = {
      ...(config ?? {}),
      key: config.key ?? "",
      title: config.title ?? "",
      questionnaireId: config.questionnaireId ?? "",
      questionnaireName: config.questionnaireName ?? "",
      questionnaireUrl: config.questionnaireUrl ?? "",
      scoringQuestionId: norm(config.scoringQuestionId) ?? "",
      subScoringQuestionIds: normArr(config.subScoringQuestionIds),
      scoringParams: config.scoringParams ?? {},
      questionLinkIds: normArr(config.questionLinkIds),
      matchMode: config.matchMode ?? "fuzzy",
      severityBands: bands,
      highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? null,
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

  questionnaireIDFromQR(qr) {
    if (!qr) return null;
    return /^Questionnaire\//i.test(qr.questionnaire) ? qr.questionnaire.split("/")[1] : qr.questionnaire;
  }

  // -------------------- Questionnaire indexing --------------------
  indexQuestionnairesInBundle(bundleOverride) {
    const idx = Object.create(null);
    for (const q of this._bundleEntries(bundleOverride)) {
      if (!q) continue;
      if (normalizeStr(q.resourceType) === normalizeStr(RT_QR)) {
        if (q.questionnaire) {
          const qIndex = this.questionnaireIDFromQR(q);
          if (!idx[qIndex]) {
            if (questionnaireConfig[qIndex]) {
              idx[qIndex] = buildQuestionnaire([], questionnaireConfig[qIndex]);
            } else {
              idx[qIndex] = {
                resourceType: "Questionnaire",
                id: qIndex,
                name: qIndex,
              };
            }
          }
        } else continue;
        continue;
      }
      if (normalizeStr(q.resourceType) !== normalizeStr(RT_Q)) continue;
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
  isLinkIdEquals(a, b) {
    return linkIdEquals(a, b, this.cfg.matchMode ?? "fuzzy");
  }
  isResponseQuestionItem(item, config) {
    if (!item || !item.linkId) return false;
    const linkId = String(item.linkId).toLowerCase();
    const configToUse = config ? config : this.cfg;
    const scoreLinkId = configToUse?.scoringQuestionId;
    const subScoreIds = configToUse?.subScoreQuestionIds;
    if (linkId === "introduction" || linkId.includes("ignore") || linkId.includes("header")) return false;
    if (!this.responseAnswerTypes.has(item.type)) return false;
    if (scoreLinkId) {
      return !this.isLinkIdEquals(item.linkId, scoreLinkId);
    }
    if (!isEmptyArray(subScoreIds)) {
      return !subScoreIds.find((id) => this.isLinkIdEquals(id, item.linkId));
    }
    return true;
  }
  isNonScoreLinkId(linkId, config = {}) {
    if (!linkId) return false;
    const subScoreQuestionIds = !isEmptyArray(config?.subScoringQuestionIds) ? config.subScoringQuestionIds : [];
    return (
      !linkIdEquals(linkId, config?.scoringQuestionId) && !subScoreQuestionIds.find((id) => linkIdEquals(id, linkId))
    );
  }

  // -------------------- Questionnaire matching --------------------
  questionnaireRefMatches(canonical, config) {
    const configToUse = config ? config : this.cfg;
    const ref = normalizeStr(canonical);
    const key = normalizeStr(configToUse.key);
    const id = normalizeStr(configToUse.questionnaireId);
    const name = normalizeStr(configToUse.questionnaireName);
    const url = normalizeStr(configToUse.questionnaireUrl);

    if ((configToUse.matchMode ?? "fuzzy") === "strict") {
      return (url && ref === url) || (id && ref === id) || (name && ref === name);
    }
    return (
      (key && fuzzyMatch(ref, key)) ||
      (id && fuzzyMatch(ref, id)) ||
      (name && fuzzyMatch(ref, name)) ||
      (url && fuzzyMatch(ref, url))
    );
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
    if (!item) return null;
    const a = item.answer;
    if (Array.isArray(a)) return a[0] ?? null; // FHIR: [{ valueString: ... }]
    return a ?? null;
  }
  findResponseItemByLinkId(flatItems, linkId) {
    const target = normalizeLinkId(linkId);
    return (flatItems || []).find((i) => this.isLinkIdEquals(normalizeLinkId(i.linkId), target)) ?? null;
  }

  // -------------------- answer readers (value[x]) --------------------
  answerCoding(ans) {
    const c = ans?.valueCoding;
    return c ? c : null;
  }
  answerCodeableConept(ans) {
    if (!isPlainObject(ans)) return null;
    if (!("valueCodeableConcept" in ans)) return null;
    return conceptText(ans.valueCodeableConcept);
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
  getAnswerLinkIdsByQuestionnaire(questionnaire, config) {
    const out = [];
    const walk = (items = []) => {
      for (const it of items) {
        if (it.linkId && it.type && this.isResponseQuestionItem(it, config)) out.push(it.linkId);
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
      return this.answerPrimitive(ext);
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
          if (!c && this.answerPrimitive(opt)) {
            const v = this.answerPrimitive(opt);
            if (found == null) found = v;
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
    //console.log("linkId ", linkId, " it ", it, " responses ", responseItemsFlat)
    const ans = this.firstAnswer(it);
    if (!ans) return null;

    // Primitive short-circuit: numbers or strings like "Nearly every day"
    if (!isPlainObject(ans)) {
      const num = toFiniteNumber(ans);
      if (num != null) return num;
      const mapped = this.fallbackScoreMap[String(ans).toLowerCase()];
      if (mapped != null) return mapped;
      return null;
    }

    const prim = this.answerPrimitive(ans);
    const primNum = toFiniteNumber(prim);
    if (primNum != null) return primNum;

    const coding = this.answerCoding(ans);
    // console.log("ans ", ans, " coding ", coding)
    if (coding?.code) {
      const fromExt = this.getAnswerValueByExtension(questionnaire, coding.code);
      if (fromExt != null && isNumber(fromExt)) return fromExt;
      const codeKey = String(coding.code).toLowerCase();
      if (this.fallbackScoreMap[codeKey] != null) return this.fallbackScoreMap[codeKey];
      //  console.log("coding code ", this.fallbackScoreMap, this.fallbackScoreMap[coding.code])
      return isNumber(coding.code) ? coding.code : null;
    }
    return null;
  }

  getAnswerItemDisplayValue(answerItem) {
    if (!answerItem) return null;
    // If it's already a primitive (e.g., "Nearly every day", 2, true), just show it
    if (!isPlainObject(answerItem)) return answerItem;
    // Prefer human display for codings
    const coding = this.answerCoding(answerItem);
    if (coding)
      return coding.display ?? (coding.code ? this.fallbackScoreMap[String(coding.code).toLowerCase()] : null) ?? null;
    // Then any primitive value[x]
    const prim = this.answerPrimitive(answerItem);
    if (!isNil(prim)) return prim;
    // Then CodeableConcept text, else stringify as last resort
    const codeableValue = this.answerCodeableConept(answerItem);
    return codeableValue ?? objectToString(answerItem);
  }

  // -------------------- formatting --------------------
  formattedResponses(questionnaireItems, responseItemsFlat, config) {
    if (
      isEmptyArray(questionnaireItems) ||
      !questionnaireItems.some((item) => responseItemsFlat?.find((o) => o.linkId === item.linkId))
    )
      return this.responsesOnly(responseItemsFlat);
    const configToUse = config ? config : this.cfg;
    const list = [];
    const walk = (items = []) => {
      for (const q of items) {
        if (q.linkId && this.isResponseQuestionItem(q, configToUse)) list.push(q);
        if (q.item?.length) walk(q.item);
      }
    };
    walk(questionnaireItems);

    const questionnaireItemList = list.map((q) => {
      const matchedResponseItem = this.findResponseItemByLinkId(responseItemsFlat, q.linkId);
      const ans = this.firstAnswer(matchedResponseItem);
      return {
        ...q,
        id: q.linkId,
        answer: this.getAnswerItemDisplayValue(ans),
        question:
          q.text ??
          (this.firstAnswer(matchedResponseItem) ? this._getQuestion(matchedResponseItem) : `Question ${q.linkId}`),
        text: matchedResponseItem?.text ? matchedResponseItem?.text : "",
      };
    });
    const allResponses = new Map();
    [
      ...questionnaireItemList,
      ...(responseItemsFlat ?? []).map((item, index) => {
        if (!item.id) item.id = item.linkId;
        const ans = this.firstAnswer(item);
        item.answer = this.getAnswerItemDisplayValue(ans);
        item.question = item.text ?? `Question ${index}`;
        return item;
      }),
    ].forEach((item) => allResponses.set(normalizeLinkId(item.id), item));
    return Array.from(allResponses.values());
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

  getDataSource(resource) {
    if (!resource) return "";
    if (!isEmptyArray(resource.extension)) {
      const source = resource.extension.find((node) => String(node.url).includes("epic"));
      return source ? "epic" : "cnics";
    }
    if (!isEmptyArray(resource.identifier)) {
      const source = resource.identifier.find((node) => String(node.system).includes("epic"));
      return source ? "epic" : "cnics";
    }
    //TODO fix this
    return "cnics";
  }

  getScoreStatsFromQuestionnaireResponse(qr, questionnaire, config = {}) {
    if (!qr) return null;
    const scoreLinkIds = !isEmptyArray(config?.questionLinkIds)
      ? config.questionLinkIds.filter((q) => this.isNonScoreLinkId(q, config))
      : this.getAnswerLinkIdsByQuestionnaire(questionnaire, config);
    const scoringQuestionId = config?.scoringQuestionId;
    const flat = this.flattenResponseItems(qr.item);

    const nonScoring = flat.filter((it) => this.isNonScoreLinkId(it.linkId, config));

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
    let totalItems = scoreLinkIds?.length ? scoreLinkIds.length : 0;
    let totalAnsweredItems = Math.min(nonScoring.filter((it) => this.firstAnswer(it) != null).length, totalItems);
    if (totalItems === 0 && score != null) {
      totalItems = 1;
    }
    if (totalAnsweredItems === 0 && score != null) {
      totalAnsweredItems = 1;
    }
    return {
      score,
      scoringQuestionScore,
      totalAnsweredItems,
      totalItems,
    };
  }

  // -------------------- public APIs --------------------
  getResponsesSummary(questionnaireResponses, questionnaire) {
    const keyToUse = firstNonEmpty(
      questionnaire?.id,
      this.cfg.questionnaireId,
      this.cfg.key,
      this.cfg.questionnaireName,
      this.cfg.questionnaireUrl,
    );
    const fromRegistry = keyToUse ? questionnaireConfig[keyToUse] : null;
    const config = mergeNonEmpty(this.cfg, fromRegistry);

    const rows = (questionnaireResponses || []).map((qr, rIndex) => {
      const flat = this.flattenResponseItems(qr.item);
      const { score, scoringQuestionScore, totalAnsweredItems, totalItems } = this.getScoreStatsFromQuestionnaireResponse(
        qr,
        questionnaire,
        config,
      );
      const source = this.getDataSource(qr);
      let responses = this.formattedResponses(questionnaire?.item ?? [], flat, config).map((item) => {
        item.source = source;
        return item;
      });
      if (isEmptyArray(responses)) responses = this.responsesOnly(flat);
      //console.log("score ", score, " totalItems ", totalItems, " total answered ", totalAnsweredItems)
      return {
        ...(config ?? {}),
        id: qr.id + "_" + rIndex,
        instrumentName: config?.instrumentName ?? this.questionnaireIDFromQR(qr),
        date: qr.authored ?? null,
        lastAssessed: new Date(qr.authored).toLocaleDateString(),
        source,
        raw: flat,
        responses,
        score,
        scoringQuestionScore,
        totalItems,
        totalAnsweredItems,
        authoredDate: qr.authored,
        lastUpdated: qr.meta?.lastUpdated,
        config: config,
        questionnaire: questionnaire,
      };
    });

    return this.sortByNewestAuthoredOrUpdated(rows);
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

  _getAnswerByTargetLinkIdFromResponseData(targetLinkId, responseData, responses_id) {
    const matchResponseData = (responseData || []).find((item) => item.id === responses_id);
    if (!matchResponseData || isEmptyArray(matchResponseData.responses)) return "--";
    const answerItem = matchResponseData.responses.find((o) => this.isLinkIdEquals(o?.id, targetLinkId));
    return this._getAnswer(answerItem);
  }

  _formatScoringSummaryData = (data, opts = {}) => {
    if (isEmptyArray(data) || !this._hasResponseData(data)) return null;
    return {
      ...data[0],
      ...getScoreParamsFromResponses(data, opts?.config),
      responseData: data,
      tableResponseData: opts?.tableResponseData ?? this._formatTableResponseData(data),
      printResponseData: opts?.printResponseData ?? this._formatPrintResponseData(data),
    };
  };

  _formatTableResponseData = (data) => {
    if (isEmptyArray(data) || !this._hasResponseData(data)) return null;

    const formattedData = data.map((item) => ({ date: item.date, id: item.id, raw: item }));

    // Use the row with max responses as the “schema”
    const anchorRowData = [...data].sort((a, b) => (b.responses?.length || 0) - (a.responses?.length || 0))[0];
    if (!anchorRowData || isEmptyArray(anchorRowData.responses)) return null;

    // Build a set of all question ids
    let qIds = Array.from(new Set(anchorRowData.responses.map((r) => r.id))),
      configToUse;

    if (data[0].questionnaireId) configToUse = questionnaireConfig[data[0].questionnaireId];
    if (isEmptyArray(qIds) && configToUse && configToUse.questionLinkIds) qIds = configToUse.questionLinkIds;
    const result = [...qIds]
      .filter((id) => !configToUse || !this.isLinkIdEquals(configToUse.scoringQuestionId, id))
      .map((qid) => {
        const row = {};
        // Question text from first available response carrying that qid
        const sample =
          (anchorRowData.responses || []).find((r) => this.isLinkIdEquals(r.id, qid)) ||
          (data.find((d) => (d.responses || []).some((r) => this.isLinkIdEquals(r.id, qid)))?.responses || []).find(
            (r) => this.isLinkIdEquals(r.id, qid),
          );
        row.id = qid;
        let question = "";
        const qItem = getQuestionnaireItemByLinkId(anchorRowData.questionnaire, qid);
        if (qItem && qItem.text) {
          question = qItem.text;
        }
        if (!question && configToUse?.itemTextByLinkId) {
          for (const key in configToUse?.itemTextByLinkId) {
            if (this.isLinkIdEquals(key, qid)) {
              question = configToUse?.itemTextByLinkId[qid];
              break;
            }
          }
        }
        row.question = sample ? this._getQuestion(sample) : question ? question : `Question ${qid}`;
        row.source = sample?.source;
        for (const d of formattedData) {
          // this is the row data for the date and id of a response set that has the requsite linkId
          row[d.id] = this._getAnswerByTargetLinkIdFromResponseData(sample.id, data, d.id);
        }
        return row;
      });

    if (this._hasScoreData(data)) {
      const scoringRow = { question: "Score", id: `score_${data.map((o) => o.id).join("")}` };
      for (const item of data) scoringRow[item.id] = { ...item, score: item.score };
      result.push(scoringRow);
    }
    return result;
  };

  _formatPrintResponseData(data, params) {
    if (!this._hasResponseData(data)) return null;

    // Current implementation prints only the first column/date
    const first = data[0];
    const headerRow = [
      "Questions",
      `${getLocaleDateStringFromDate(first.date)} ${first.source ? "(" + first.source + ")" : ""}`.trim(),
    ];
    const bodyRows = (first.responses || []).map((row) => [
      this._getQuestion(row),
      this._getAnswerByTargetLinkIdFromResponseData(row.id, data, first.id),
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

  // Inside QuestionnaireScoringBuilder

  /**
   * Build synthetic QuestionnaireResponses that keep only one source linkId
   * from a host questionnaire’s responses (e.g., PHQ-9 → keep /44260-8 for CIRG-SI).
   *
   * Input: hostQrs = array of real QuestionnaireResponses (PHQ-9).
   * Output: array of synthetic QRs for targetQuestionnaireId containing ONLY linkId.
   */
  buildDerivedSingleLinkQrs(
    hostQrs = [],
    {
      linkId, // e.g. "/44260-8"
      targetQuestionnaireId, // e.g. "CIRG-SI"
      normalizeAnswerToCoding = (ans) => {
        // Default: map free-text to valueCoding(code/display = lowercased text)
        if (isNonEmptyString(ans) && DEFAULT_VAL_TO_LOIN_CODE[normalizeStr(ans.toLowerCase())])
          return { valueCoding: DEFAULT_VAL_TO_LOIN_CODE[normalizeStr(ans.toLowerCase())] };
        const display = String(ans ?? "");
        const code = display.trim().toLowerCase();
        return { valueCoding: { system: "local/derived", code, display } };
      },
    } = {},
  ) {
    if (!linkId || !targetQuestionnaireId) return [];

    const out = [];
    const formattedQrs = (hostQrs || [])
      .map((qr) => {
        if (qr.resource) return qr.resource;
        return qr;
      })
      .filter((o) => (o.resourceType = "QuestionnaireResponse"));
    for (const qr of formattedQrs) {
      // locate the item by linkId in the *FHIR* shape (qr.item[].answer[*].valueX)
      const it = (qr.item || []).find((i) => this.isLinkIdEquals(i.linkId, linkId));
      if (!it) continue;
      if (!qr.authored) continue;

      // normalize answer - FHIR value[x]
      let answers = [];
      // tolerate "flattened" shapes or proper FHIR shape
      if (Array.isArray(it.answer) && it.answer.length && typeof it.answer[0] === "object") {
        answers = it.answer;
      } else {
        // non-FHIR shape (answer: "Nearly every day") - convert
        answers = [normalizeAnswerToCoding(it.answer)];
      }

      out.push({
        resourceType: "QuestionnaireResponse",
        id: `${qr.id}_${targetQuestionnaireId}`,
        meta: qr.meta,
        questionnaire: `Questionnaire/${targetQuestionnaireId}`,
        status: "completed",
        subject: qr.subject,
        authored: qr.authored,
        author: qr.author,
        item: [{ linkId, text: it.text || linkId, answer: answers }],
      });
    }
    return out;
  }

  // Inside QuestionnaireScoringBuilder._summariesByQuestionnaireRef(qrs, questionnaire, options = {})

  _summariesByQuestionnaireRef(qrs, questionnaire, options = {}) {
    const keyToUse = firstNonEmpty(
      questionnaire?.id,
      this.cfg.questionnaireId,
      this.cfg.key,
      this.cfg.questionnaireName,
      this.cfg.questionnaireUrl,
    );
    const fromRegistry = keyToUse ? questionnaireConfig[keyToUse] : null;
    const config = mergeNonEmpty(this.cfg, fromRegistry);

    //console.log("key ", keyToUse, " config actually used ", config, " qrs ", qrs);

    // If this instrument is defined as "derived" from a host instrument,
    // synthesize single-link QRs from the host QRs *when needed*.
    if (config?.deriveFrom?.linkId && !isEmptyArray(config?.deriveFrom?.hostIds)) {
      const { linkId, hostIds, normalizeAnswerToCoding } = config.deriveFrom;

      // If caller passed QRs that already belong to this instrument, proceed as usual.
      // But if QRs actually look like host QRs (or are empty), try to derive.
      const looksLikeHost = (arr) =>
        (arr || []).some((qr) => {
          const q = qr?.resource?.questionnaire || "";
          return hostIds.some((hid) => this.questionnaireRefMatches(q, { questionnaireId: hid, matchMode: "fuzzy" }));
        });

      if (!qrs?.length || looksLikeHost(qrs)) {
        // We need host QRs. If caller gave us host QRs directly, use them.
        // Otherwise pull them from the bundle groups this instance can see.
        let hostQrs = [];
        if (looksLikeHost(qrs)) {
          hostQrs = qrs;
        } else {
          // Search bundle for host groups
          const groups = this.fromBundleGrouped({ completedOnly: true });
          for (const k of Object.keys(groups)) {
            if (hostIds.some((hid) => this.questionnaireRefMatches(k, { questionnaireId: hid, matchMode: "fuzzy" }))) {
              hostQrs.push(...groups[k]);
            }
          }
        }

        // Build synthetic QRs carrying only the target linkId for THIS instrument
        const derivedQrs = this.buildDerivedSingleLinkQrs(hostQrs, {
          linkId,
          targetQuestionnaireId: questionnaire?.id || config?.questionnaireId || config?.key || "DERIVED",
          normalizeAnswerToCoding,
        });

        // Swap in derived QRs for the rest of the pipeline
        qrs = derivedQrs;
      }
    }
    // === END derived ===========================================================

    // choose summarization strategy
    const strategyMap = { SLUM: "summarizeSLUM", CIDAS: "summarizeCIDAS", MINICOG: "summarizeMiniCog" };
    const selectedKey = Object.keys(strategyMap).find((k) => this.questionnaireRefMatches(k, config));
    const evalData = selectedKey
      ? this[strategyMap[selectedKey]](qrs, questionnaire, options)
      : this.getResponsesSummary(qrs, questionnaire);

    // compute scoring/series/params/chart domain/etc.
    const scoringData = !isEmptyArray(evalData)
      ? evalData.filter((item) => item && !isEmptyArray(item.responses) && isNumber(item.score) && item.date)
      : null;

    const chartConfig = getChartConfig(questionnaire?.id);
    let chartData = !isEmptyArray(scoringData)
      ? scoringData.map((item, index) => ({
          ...item,
          id: item.id + "_" + item.instrumentName + "_" + index,
          total: item.score,
        }))
      : null;

    let xDomain;
    if (chartData && chartConfig?.dataFormatter) {
      chartData = chartConfig.dataFormatter(chartData);
      const arrDates = !isEmptyArray(chartData) ? chartData?.map((d) => d.date) : [];
      const dates = !isEmptyArray(arrDates) ? [...new Set(arrDates)] : [];
      xDomain = getDateDomain(dates, { padding: dates.length <= 2 ? 0.15 : 0.05 });
    }

    const scoringParams = config?.scoringParams ?? {};
    const { key, id, ...restOfConfig } = config ?? {};
    const chartParams = { ...restOfConfig, ...chartConfig, ...scoringParams, ...(config?.chartParams ?? {}), xDomain };

    const tableResponseData = this._formatTableResponseData(evalData);
    const printResponseData = this._formatPrintResponseData(evalData, config);
    const scoringSummaryData = this._formatScoringSummaryData(evalData, {
      tableResponseData,
      printResponseData,
      config,
    });

    return {
      config: config,
      chartConfig: chartParams,
      chartData: { ...chartParams, data: chartData },
      chartType: chartConfig?.type,
      responseData: evalData,
      scoringSummaryData,
      tableResponseData,
      printResponseData,
      questionnaire,
      key: questionnaire?.id,
      error: !questionnaire ? "No associated questionnaire found" : "",
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
      out[canonical] = summaries;
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
