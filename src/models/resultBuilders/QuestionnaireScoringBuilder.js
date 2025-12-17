import {
  deepMerge,
  firstNonEmpty,
  getChartConfig,
  getLocaleDateStringFromDate,
  isEmptyArray,
  isNil,
  isNonEmptyString,
  isNumber,
  isPlainObject,
  fuzzyMatch,
  normalizeStr,
  objectToString,
  toFiniteNumber,
} from "@util";
import Response from "@models/Response";
import FhirResultBuilder from "./FhirResultBuilder";
import {
  buildQuestionnaire,
  calculateQuestionnaireScore,
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
const normalizeObjectKeys = (o) =>
  o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [String(k).toLowerCase(), v])) : null;

export default class QuestionnaireScoringBuilder extends FhirResultBuilder {
  /**
   * @param {Object} config
   * @param {string} config.key
   * @param {string} config.title
   * @param {string} config.subtitle
   * @param {string} config.questionnaireId
   * @param {string} config.questionnaireName
   * @param {string} config.questionnaireUrl
   * @param {string|null} config.scoringQuestionId
   * @param {Object} [config.scoringParams]
   * @param {string[]} [config.questionLinkIds]
   * @param {string[]}[config.subScoringQuestionIds]
   * @param {'strict'|'fuzzy'} [config.questionnaireMatchMode]
   * @param {'strict'|'fuzzy'} [config.linkIdMatchMode]
   * @param {number} config.highSeverityScoreCutoff
   * @param {{min:number,label:string,meaning?:string}[]} [config.severityBands]
   * @param {function} config.fallbackMeaningFunc
   * @param {Object|Array} patientBundle
   */
  constructor(config = {}, patientBundle) {
    super();

    const bands = !isEmptyArray(config?.severityBands) ? [...config.severityBands] : null;
    if (bands) bands.sort((a, b) => (b.min ?? 0) - (a.min ?? 0));

    const rawFallback = config?.fallbackScoreMap ?? DEFAULT_FALLBACK_SCORE_MAPS.default;
    this.fallbackScoreMap = normalizeObjectKeys(rawFallback);

    // normalize linkIds from config once
    const norm = (id) => (id == null ? id : normalizeLinkId(String(id)));
    const normArr = (arr) => (isEmptyArray(arr) ? null : arr.map(norm));

    this.cfg = {
      ...(config ?? {}),
      key: config.key ?? "",
      title: config.title ?? "",
      subtitle: config.title ?? "",
      questionnaireId: config.questionnaireId ?? "",
      questionnaireName: config.questionnaireName ?? "",
      questionnaireUrl: config.questionnaireUrl ?? "",
      scoringQuestionId: norm(config.scoringQuestionId) ?? "",
      subScoringQuestionIds: normArr(config.subScoringQuestionIds),
      scoringParams: config.scoringParams ?? {},
      questionLinkIds: normArr(config.questionLinkIds),
      questionnaireMatchMode: config.questionnaireMatchMode ?? "fuzzy",
      linkIdMatchMode: config.linkIdMatchMode ?? "fuzzy",
      severityBands: bands,
      highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? null,
      fallbackMeaningFunc: config.fallbackMeaningFunc ?? null,
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

    let entries = [];

    // Array of {resource} entries OR bare resources
    if (Array.isArray(b)) {
      // prevent mutation of original array
      entries = [...b].map((x) => (x && x.resource ? x.resource : x)).filter((r) => r && r.resourceType);
    }
    // Proper Bundle
    else if (!isEmptyArray(b?.entry)) {
      // prevent mutation of original array
      entries = [...b.entry].map((e) => e.resource).filter(Boolean);
    }

    // Warn about large bundles
    if (entries.length > 1000) {
      console.warn(`_bundleEntries: processing large bundle with ${entries.length} entries`);
    }

    return entries;
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
      const list = groups[k];
      if (isEmptyArray(list)) continue;
      const mapped = list.map((qr) => ({
        authoredDate: qr.authored ?? null,
        lastUpdated: qr.meta?.lastUpdated ?? null,
        _qr: qr,
      }));
      groups[k] = this.sortByNewestAuthoredOrUpdated(mapped).map((x) => x._qr);
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
  isLinkIdEquals(a, b, config = {}) {
    // Ensure both inputs are normalized before comparison
    const normalizedA = normalizeLinkId(a);
    const normalizedB = normalizeLinkId(b);
    const configToUse = config ? config : this.cfg;
    return linkIdEquals(normalizedA, normalizedB, configToUse.linkIdMatchMode ?? "fuzzy");
  }

  isHelpQuestionItem(item) {
    if (!item) return false;
    return (
      !isEmptyArray(item.extension) &&
      item.extension.find((o) => o.valueCodeableConcept?.coding?.find((o) => o.code === "help"))
    );
  }

  isValueExpressionQuestionItem(item) {
    if (!item) return false;
    return !isEmptyArray(item.extension) && item.extension.find((o) => o.valueExpression);
  }

  isResponseQuestionItem(item, config) {
    if (!item) return false;
    if (item.readOnly) return false;
    const linkId = String(item.linkId).toLowerCase();
    const configToUse = config ? config : this.cfg;
    const scoreLinkId = configToUse?.scoringQuestionId;
    const subScoreIds = configToUse?.subScoreQuestionIds;
    if (
      linkId === "introduction" ||
      linkId.includes("ignore") ||
      // linkId.includes("header") ||
      linkId.includes("score-label") ||
      linkId.includes("critical-flag")
    )
      return false;
    if (item.type && !this.responseAnswerTypes.has(item.type)) return false;
    if (scoreLinkId) {
      return !this.isLinkIdEquals(item.linkId, scoreLinkId, config);
    }
    if (!isEmptyArray(subScoreIds)) {
      return !subScoreIds.find((id) => this.isLinkIdEquals(id, item.linkId, config));
    }
    return true;
  }
  isNonScoreLinkId(linkId, config = {}) {
    if (!linkId) return false;
    if (config?.questionLinkIds?.indexOf(linkId) !== -1) return true;
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

    if ((configToUse.questionnaireMatchMode ?? "fuzzy") === "strict") {
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
  flattenResponseItems(items = [], maxDepth = 100) {
    const out = [];
    let depth = 0;

    const walk = (arr) => {
      if (depth++ > maxDepth) {
        console.warn("flattenResponseItems: max depth exceeded, possible circular reference");
        return;
      }

      for (const it of arr || []) {
        out.push(it);
        if (!isEmptyArray(it.item)) walk(it.item);
        for (const ans of it.answer || []) {
          if (!isEmptyArray(ans.item)) walk(ans.item);
        }
      }
      depth--;
    };

    walk(items);

    if (out.length > 10000) {
      console.warn(`flattenResponseItems: large result set (${out.length} items)`);
    }

    return out;
  }
  firstAnswer(item) {
    if (!item) return null;
    const a = item.answer;
    if (Array.isArray(a)) return a[0] ?? null; // FHIR: [{ valueString: ... }]
    return a ?? null;
  }
  findResponseItemByLinkId(flatItems, linkId, config = {}) {
    const target = normalizeLinkId(linkId);
    return (flatItems || []).find((i) => this.isLinkIdEquals(normalizeLinkId(i.linkId), target, config)) ?? null;
  }

  // -------------------- answer readers (value[x]) --------------------
  answerCoding(ans) {
    const c = ans?.valueCoding;
    return c ? c : null;
  }
  answerCodeableConcept(ans) {
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
    if (!questionnaire?.item) {
      console.warn("getAnswerValueByExtension: questionnaire or questionnaire.item is missing");
      return null;
    }
    if (!code) {
      console.warn("getAnswerValueByExtension: code parameter is required");
      return null;
    }
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
    if (found === null) {
      console.warn(`getAnswerValueByExtension: no value found for code "${code}"`);
    }
    return found;
  }

  // -------------------- scoring --------------------
  getScoringByResponseItem(questionnaire, responseItemsFlat, linkId, config = {}) {
    const it = this.findResponseItemByLinkId(responseItemsFlat, linkId, config);
    if (it == null) return null;
    const ans = this.firstAnswer(it);
    if (ans == null) return null;
    return this.getScoreByAnswerItem(ans, questionnaire, config);
  }
  getScoreByAnswerItem(ans, questionnaire, config = {}) {
    if (ans == null) return null;
    const fallbackScoreMap = normalizeObjectKeys(
      config?.fallbackScoreMap ? config?.fallbackScoreMap : this.fallbackScoreMap,
    );
    // Primitive short-circuit: numbers or strings like "Nearly every day"
    if (!isPlainObject(ans)) {
      const num = toFiniteNumber(ans);
      if (num != null) return num;
      const mapped = fallbackScoreMap[String(ans).toLowerCase()];
      if (mapped != null) return mapped;
      return null;
    }

    const prim = this.answerPrimitive(ans);
    const primNum = toFiniteNumber(prim);
    if (primNum != null) return primNum;

    const coding = this.answerCoding(ans);
    if (coding?.code) {
      const codeKey = String(coding.code).toLowerCase();
      if (fallbackScoreMap[codeKey] != null) return fallbackScoreMap[codeKey];
      const fromExt = this.getAnswerValueByExtension(questionnaire, coding.code);
      if (fromExt != null && isNumber(fromExt)) return fromExt;
      return isNumber(coding.code) ? coding.code : null;
    }
    return null;
  }

  getAnswerItemDisplayValue(answerItem, opts = {}) {
    if (answerItem == null) return null;

    const fallbackScoreMap = normalizeObjectKeys(opts?.fallbackScoreMap ?? this.fallbackScoreMap);

    // Helper to handle a *single* answer item
    const getSingleDisplayValue = (item) => {
      if (item == null) return null;

      // If it's already a primitive (e.g., "Nearly every day", 2, true), just show it
      if (!isPlainObject(item)) return item;

      // Prefer human display for codings
      const coding = this.answerCoding(item);
      if (coding) {
        const normalizedCode = coding.code != null ? String(coding.code).toLowerCase() : null;
        return coding.display ?? (normalizedCode ? fallbackScoreMap[normalizedCode] : null) ?? null;
      }

      // Then any primitive value[x]
      const prim = this.answerPrimitive(item);
      if (!isNil(prim)) return prim;

      // Then CodeableConcept text, else stringify as last resort
      const codeableValue = this.answerCodeableConcept(item);
      return codeableValue ?? objectToString(item);
    };

    // If the answer item is an array, map over it
    if (Array.isArray(answerItem)) {
      const values = answerItem.map(getSingleDisplayValue).filter((v) => !isNil(v) && v !== "");

      if (!values.length) return null;

      // Allow caller to get back an array instead of a string
      if (opts.returnArray) return values;

      const joinWith = opts.joinWith ?? "\n";
      return values.join(joinWith);
    }

    // Otherwise treat it as a single item
    return getSingleDisplayValue(answerItem);
  }

  getAnswerByResponseLinkId(linkId, responseItemsFlat, config = {}) {
    if (!linkId || isEmptyArray(responseItemsFlat)) return null;
    const it = this.findResponseItemByLinkId(responseItemsFlat, linkId, config);
    if (it == null) return null;
    return this.getAnswerItemDisplayValue(this.firstAnswer(it), config);
  }

  // -------------------- formatting --------------------
  formattedResponses(questionnaireItems, responseItemsFlat, config) {
    if (
      isEmptyArray(questionnaireItems) ||
      !questionnaireItems.some((item) => responseItemsFlat?.find((o) => o.linkId === item.linkId))
    )
      return this.responsesOnly(responseItemsFlat, config);

    if (isEmptyArray(responseItemsFlat)) return [];
    const configToUse = config ? config : this.cfg;
    const list = [];
    const walk = (items = []) => {
      for (const q of items) {
        if (q.linkId) list.push(q);
        if (q.item?.length) walk(q.item);
      }
    };
    walk(questionnaireItems);
    const questionnaireItemList = list.map((q) => {
      const matchedResponseItem = this.findResponseItemByLinkId(responseItemsFlat, q.linkId, config);
      const ans = matchedResponseItem?.answer;
      let returnObject = deepMerge({}, matchedResponseItem);
      returnObject.id = q.linkId;
      returnObject.answer = this.getAnswerItemDisplayValue(ans, config);
      returnObject.rawAnswer = matchedResponseItem?.answer ?? [];
      if (!this.isResponseQuestionItem(q, configToUse)) returnObject.readOnly = true;
      if (this.isValueExpressionQuestionItem(q)) returnObject.isValueExpression = true;
      if (this.isHelpQuestionItem(q)) q.isHelp = true;
      returnObject.question =
        q.text ??
        (!isEmptyArray(matchedResponseItem) ? this._getQuestion(matchedResponseItem[0]) : `Question ${q.linkId}`);
      returnObject.text = matchedResponseItem?.text ? matchedResponseItem?.text : "";
      return returnObject;
    });
    if (!isEmptyArray(questionnaireItemList)) return questionnaireItemList;
    return (responseItemsFlat ?? []).map((item, index) => {
      let returnObject = deepMerge({}, item);
      if (!returnObject.id) returnObject.id = item.linkId;
      if (!this.isResponseQuestionItem(item, configToUse)) returnObject.readOnly = true;
      const ans = item.answer;

      returnObject.answer = this.getAnswerItemDisplayValue(ans, config);
      returnObject.question = item.text ?? `Question ${index}`;
      returnObject.rawAnswer = item.answer;
      return returnObject;
    });
  }

  responsesOnly(responseItemsFlat = [], config = {}) {
    if (isEmptyArray(responseItemsFlat)) return [];
    return (responseItemsFlat || []).map((item) => {
      const ans = item.answer;
      return {
        ...item,
        id: item.linkId,
        answer: this.getAnswerItemDisplayValue(ans, config),
        rawAnswer: item.answer,
        question: item.text,
      };
    });
  }

  getDataSource(resource) {
    if (!resource) return "";
    let source = "";
    if (!isEmptyArray(resource.extension)) {
      const match = resource.extension.find((node) => String(node.url).includes("epic"));
      if (match) {
        source = "epic";
      }
    }
    if (!isEmptyArray(resource.identifier)) {
      let match = resource.identifier.find((node) => String(node.system).includes("epic"));
      if (match) {
        source = "epic";
      }
      match = resource.identifier.find((node) => String(node.system).includes("cnics"));
      if (match) {
        source = "cnics";
      }
    }
    if (isPlainObject(resource.identifier)) {
      if (resource.identifier?.system) {
        source = resource.identifier.system.includes("cnics")
          ? "cnics"
          : resource.identifier.system.includes("epic")
            ? "epic"
            : "";
      }
    }
    if (!source) return "epic";
    return source;
  }

  getScoreStatsFromQuestionnaireResponse(qr, questionnaire, config = {}) {
    if (!qr) return null;

    const flat = this.flattenResponseItems(qr.item);
    const nonScoring = flat.filter((it) => this.isNonScoreLinkId(it.linkId, config));

    const { score, scoringQuestionScore, scoreLinkIds } = calculateQuestionnaireScore(
      questionnaire,
      qr,
      flat,
      config,
      this,
    );

    let totalItems = scoreLinkIds?.length ?? 0;
    let totalAnsweredItems = Math.min(nonScoring.filter((it) => this.firstAnswer(it) != null).length, totalItems);

    if (totalItems === 0 && score != null) totalItems = 1;
    if (totalAnsweredItems === 0 && score != null) totalAnsweredItems = 1;

    return { score, scoringQuestionScore, totalAnsweredItems, totalItems };
  }

  getColumnObjects(columns, qr, config = {}) {
    if (isEmptyArray(columns) || !qr) return {};
    let out = {};
    const qrItems = qr.item || [];
    for (const col of columns) {
      if (!col?.id) continue;
      const matchItem = qrItems.find((it) => this.isLinkIdEquals(it.linkId, col.linkId));
      const ans = matchItem?.answer;
      out[col.id] = matchItem ? this.getAnswerItemDisplayValue(ans, config) : null;
    }
    return out;
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
    const config = fromRegistry ? fromRegistry : this.cfg;

    const rows = (questionnaireResponses || []).map((qr, rIndex) => {
      const flat = this.flattenResponseItems(qr.item);
      const { score, scoringQuestionScore, totalAnsweredItems, totalItems } =
        this.getScoreStatsFromQuestionnaireResponse(qr, questionnaire, config);
      const source = this.getDataSource(qr);
      let responses = this.formattedResponses(questionnaire?.item ?? [], flat, config).map((item) => {
        item.source = source;
        return item;
      });
      if (isEmptyArray(responses)) responses = this.responsesOnly(flat, config);

      return {
        ...(config ?? {}),
        ...(config?.columns ? this.getColumnObjects(config.columns, qr, config) : {}),
        id: qr.id + "_" + rIndex,
        instrumentName: config?.instrumentName ?? this.questionnaireIDFromQR(qr),
        date: qr.authored ?? null,
        displayDate: getLocaleDateStringFromDate(qr.authored),
        source,
        responses,
        score,
        scoringQuestionScore,
        totalItems,
        totalAnsweredItems,
        authoredDate: qr.authored,
        lastUpdated: qr.meta?.lastUpdated,
        config: config,
        questionnaire,
        questionnaireResponse: qr,
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
    return (
      !isEmptyArray(data) &&
      !data.find((item) => item.displayMeaningNotScore) &&
      !!data.find((item) => isNumber(item.score))
    );
  }
  _hasMeaningData(data) {
    return !isEmptyArray(data) && data.find((item) => item.displayMeaningNotScore);
  }

  _getAnswerByTargetLinkIdFromResponseData(targetLinkId, responseData, responses_id, config = {}) {
    const matchResponseData = (responseData || []).find((item) => item.id === responses_id);
    if (!matchResponseData || isEmptyArray(matchResponseData.responses)) return "--";
    const answerItem = matchResponseData.responses.find((o) => this.isLinkIdEquals(o?.id, targetLinkId, config));
    return this._getAnswer(answerItem);
  }

  _normalizeDisplay(text, row) {
    if (!text) return "";
    return text.replace("{date}", row?.date ? getLocaleDateStringFromDate(row?.date) : "recent");
  }

  _formatScoringSummaryData = (data, opts = {}) => {
    if (isEmptyArray(data) || !this._hasResponseData(data)) return null;
    const subtitle = opts?.config?.subtitle ? this._normalizeDisplay(opts?.config?.subtitle, data[0]) : "";
    return {
      ...data[0],
      ...getScoreParamsFromResponses(data, opts?.config),
      subtitle,
      displayMeaningOnly: !this._hasScoreData(data),
      responseData: data,
      tableResponseData: opts?.tableResponseData ?? this._formatTableResponseData(data),
      printResponseData: opts?.printResponseData ?? this._formatPrintResponseData(data),
    };
  };

  _formatTableResponseData = (data, config) => {
    if (isEmptyArray(data) || !this._hasResponseData(data)) return null;

    const formattedData = data.map((item) => {
      return { ...item, raw: item };
    });

    // Use the row with max responses as the “schema”
    const anchorRowData = [...data].sort((a, b) => (b.responses?.length || 0) - (a.responses?.length || 0))[0];
    if (!anchorRowData || isEmptyArray(anchorRowData.responses)) return null;
    // Build a set of all question ids
    let qIds = [],
      configToUse = config;
    if (!configToUse) {
      if (data[0].questionnaireId) configToUse = questionnaireConfig[data[0].questionnaireId];
    }
    if (configToUse && configToUse.questionLinkIds) qIds = configToUse.questionLinkIds;
    if (isEmptyArray(qIds)) {
      qIds = Array.from(new Set(anchorRowData.responses.map((r) => r.id).filter((id) => id != null)));
    }
    const result = [...qIds]
      .map((qid) => {
        const row = {};
        // Question text from first available response carrying that qid
        const sample =
          (anchorRowData.responses || []).find((r) => this.isLinkIdEquals(r.id, qid, configToUse)) ||
          (
            data.find((d) => (d.responses || []).some((r) => this.isLinkIdEquals(r.id, qid, configToUse)))?.responses ||
            []
          ).find((r) => this.isLinkIdEquals(r.id, qid, configToUse));
        row.id = qid;
        row.linkId = qid;
        let question = "";
        const qItem = getQuestionnaireItemByLinkId(anchorRowData.questionnaire, qid);
        if (qItem && qItem.text) {
          question = qItem.text;
        }
        if (!question && configToUse?.itemTextByLinkId) {
          for (const key in configToUse?.itemTextByLinkId) {
            if (this.isLinkIdEquals(key, qid, configToUse)) {
              question = configToUse?.itemTextByLinkId[qid];
              break;
            }
          }
        }
        row.question = sample ? this._getQuestion(sample) : question ? question : `Question ${qid}`;
        row.source = sample?.source;
        row.readOnly = sample?.readOnly || false;
        row.isValueExpression = sample?.isValueExpression || false;
        row.isHelp = sample?.isHelp || false;
        row.config = configToUse;
        for (const d of formattedData) {
          // this is the row data for the date and id of a response set that has the requsite linkId
          row[d.id] = this._getAnswerByTargetLinkIdFromResponseData(sample?.id, data, d.id, configToUse);
          row[`${d.id}_data`] = getScoreParamsFromResponses([d], configToUse);
        }
        return row;
      })
      .filter((r) => !r.isValueExpression && !r.isHelp);

    if (this._hasScoreData(data)) {
      const scoringRow = {
        question: "Score / Meaning",
        id: `score_${data.map((o) => o.id).join("")}`,
        config: configToUse,
      };
      for (const item of data)
        scoringRow[item.id] = {
          ...getScoreParamsFromResponses([item], configToUse),
          score: item.score,
          meaning: item.meaning,
        };
      result.push(scoringRow);
    }
    if (this._hasMeaningData(data)) {
      const meaningRow = {
        question: "Score / Meaning",
        id: `meaning_${data.map((o) => o.id).join("")}`,
        config: configToUse,
      };
      for (const item of data)
        meaningRow[item.id] = {
          ...getScoreParamsFromResponses([item], configToUse),
          score: null,
          hasMeaning: true,
        };
      result.push(meaningRow);
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
      this._getAnswerByTargetLinkIdFromResponseData(row.id, data, first.id, params),
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
      .filter((o) => o.resourceType === "QuestionnaireResponse");
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
        identifier: qr.identifier,
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
    const config = fromRegistry ? fromRegistry : this.cfg;

    // If this instrument is defined as "derived" from a host instrument,
    // synthesize single-link QRs from the host QRs *when needed*.
    let hasHostMatch = true;
    if (config?.deriveFrom?.linkId && !isEmptyArray(config?.deriveFrom?.hostIds)) {
      const { linkId, hostIds, normalizeAnswerToCoding } = config.deriveFrom;

      // If caller passed QRs that already belong to this instrument, proceed as usual.
      // But if QRs actually look like host QRs (or are empty), try to derive.
      const looksLikeHost = (arr) =>
        (arr || []).some((qr) => {
          const q = qr?.resource?.questionnaire || qr?.questionnaire || "";
          return hostIds.some((hid) =>
            this.questionnaireRefMatches(q, { questionnaireId: hid, questionnaireMatchMode: "fuzzy" }),
          );
        });

      hasHostMatch = looksLikeHost(qrs);

      if (!qrs?.length || hasHostMatch) {
        // We need host QRs. If caller gave us host QRs directly, use them.
        // Otherwise pull them from the bundle groups this instance can see.
        let hostQrs = [];
        if (hasHostMatch) {
          hostQrs = qrs;
        } else {
          // Search bundle for host groups
          const groups = this.fromBundleGrouped({ completedOnly: true });
          for (const k of Object.keys(groups)) {
            if (
              hostIds.some((hid) =>
                this.questionnaireRefMatches(k, { questionnaireId: hid, questionnaireMatchMode: "fuzzy" }),
              )
            ) {
              hostQrs.push(...groups[k]);
              hasHostMatch = true;
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
    const scoringData =
      !config?.skipChart && !isEmptyArray(evalData)
        ? evalData.filter((item) => item && !isEmptyArray(item.responses) && isNumber(item.score) && item.date)
        : null;

    const chartConfig = getChartConfig(questionnaire?.id);
    let chartData = !isEmptyArray(scoringData)
      ? scoringData.map((item, index) => ({
          ...item,
          ...getScoreParamsFromResponses(scoringData.slice(index), config),
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
    const chartParams = { ...chartConfig, ...scoringParams, ...restOfConfig, ...(config?.chartParams ?? {}), xDomain };

    const tableResponseData = this._formatTableResponseData(evalData, config);
    const printResponseData = this._formatPrintResponseData(evalData, config);
    const scoringSummaryData = this._formatScoringSummaryData(evalData, {
      tableResponseData,
      printResponseData,
      config,
    });

    return {
      config,
      chartConfig: chartParams,
      chartData: { ...chartParams, data: chartData },
      chartType: chartConfig?.type,
      responseData: evalData,
      scoringSummaryData,
      tableResponseData,
      printResponseData,
      questionnaire,
      key: questionnaire?.id,
      error: !hasHostMatch && !questionnaire ? "No associated questionnaire found" : "",
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
