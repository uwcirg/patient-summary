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
  isValidDate,
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
  getComparisonDisplayIconByRow,
  getNormalizedRowTitleDisplay,
  getNumAnsweredDisplayByRow,
  getResponseColumns,
  getScoreParamsFromResponses,
  getScoreRangeDisplayByRow,
  getQuestionnaireFromRowData,
  summarizeCIDASHelper,
  summarizeMiniCogHelper,
  summarizeSLUMHelper,
  getTitleByRow,
  getScoringLinkIdFromConfig,
} from "./helpers";
import { DEFAULT_FALLBACK_SCORE_MAPS, DEFAULT_VAL_TO_LOIN_CODE, EXCLUDED_LINK_ID_KEYWORDS } from "@/consts";
import questionnaireConfig from "@/config/questionnaire_config";
import {
  conceptText,
  getQuestionnaireItemByLinkId,
  getResourcesByResourceType,
  linkIdEquals,
  normalizeLinkId,
} from "@/util/fhirUtil";
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
   * @param {Object}[config.subScoringQuestions]
   * @param {'strict'|'fuzzy'} [config.questionnaireMatchMode]
   * @param {'strict'|'fuzzy'} [config.linkIdMatchMode]
   * @param {number} config.highSeverityScoreCutoff
   * @param {{min:number,label:string,meaning?:string}[]} [config.severityBands]
   * @param {function} config.fallbackMeaningFunc
   * @param {array} config.excludeQuestionLinkIdPatterns
   * @param {Object|Array} patientBundle
   */
  constructor(config = {}, patientBundle) {
    super();

    // Sort severity bands from highest to lowest minimum value
    // Create a defensive copy to avoid mutating the input config
    const severityBands = !isEmptyArray(config?.severityBands)
      ? [...config.severityBands].sort((a, b) => (b.min ?? 0) - (a.min ?? 0))
      : null;

    const rawFallback = config?.fallbackScoreMap ?? DEFAULT_FALLBACK_SCORE_MAPS.default;
    this.fallbackScoreMap = normalizeObjectKeys(rawFallback);

    // normalize linkIds from config once
    const normalizedLinkId = (id) => (id == null ? id : normalizeLinkId(String(id)));
    const normalizeLinkIdArray = (arr) => (isEmptyArray(arr) ? null : arr.map(normalizedLinkId));

    this.cfg = {
      ...(config ?? {}),
      key: config.key ?? "",
      title: config.title ?? "",
      subtitle: config.subtitle ?? "", // Fixed: was config.title
      questionnaireId: config.questionnaireId ?? "",
      questionnaireName: config.questionnaireName ?? "",
      questionnaireUrl: config.questionnaireUrl ?? "",
      scoringQuestionId: normalizeLinkId(config.scoringQuestionId) ?? "",
      subScoringQuestions: config.subScoringQuestions,
      scoringParams: config.scoringParams ?? {},
      questionLinkIds: normalizeLinkIdArray(config.questionLinkIds),
      questionnaireMatchMode: config.questionnaireMatchMode ?? "fuzzy",
      linkIdMatchMode: config.linkIdMatchMode ?? "fuzzy",
      severityBands, // Use the sorted copy
      highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? null,
      fallbackMeaningFunc: config.fallbackMeaningFunc ?? null,
      excludeQuestionLinkIdPatterns: config.excludeQuestionLinkIdPatterns ?? null,
    };

    this.patientBundle = patientBundle || null;

    // Add cache for bundle grouping
    this._bundleGroupsCache = null;
    this._bundleCacheKey = null;

    // Add questionnaire index cache
    this._questionnaireIndexCache = null;
    this._questionnaireIndexCacheKey = null;

    this.responseAnswerTypes = new Set([
      "boolean",
      "choice",
      "decimal",
      "coding",
      "integer",
      "date",
      "dateTime",
      "time",
      "string",
      "text",
      "open-choice",
    ]);
  }

  _resolveConfig(config) {
    return config ?? this.cfg;
  }

  // -------------------- Bundle access --------------------

  /**
   * Generate a cache key for a bundle to detect if it has changed
   * @private
   */
  _getBundleCacheKey(bundleOverride) {
    const bundle = bundleOverride || this.patientBundle;
    if (!bundle) return null;

    // Simple cache key based on bundle structure
    // For arrays: use length and first/last resource types
    if (Array.isArray(bundle)) {
      const firstType = bundle[0]?.resourceType || bundle[0]?.resource?.resourceType;
      const lastType = bundle[bundle.length - 1]?.resourceType || bundle[bundle.length - 1]?.resource?.resourceType;
      return `array_${bundle.length}_${firstType}_${lastType}`;
    }

    // For proper bundles: use entry count and bundle id if available
    const entryCount = bundle.entry?.length || 0;
    const bundleId = bundle.id || "no-id";
    return `bundle_${bundleId}_${entryCount}`;
  }
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

  /**
   * Get grouped bundle with caching to avoid repeated processing
   * @private
   */
  fromBundleGrouped({ completedOnly = true } = {}, bundleOverride) {
    const currentCacheKey = this._getBundleCacheKey(bundleOverride);
    const cacheKeyWithOptions = `${currentCacheKey}_completed_${completedOnly}`;

    // Return cached result if bundle hasn't changed
    if (this._bundleCacheKey === cacheKeyWithOptions && this._bundleGroupsCache) {
      return this._bundleGroupsCache;
    }

    // Bundle changed or not cached yet - recompute
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

    // Cache the result
    this._bundleGroupsCache = groups;
    this._bundleCacheKey = cacheKeyWithOptions;

    return groups;
  }

  /**
   * Clear the bundle grouping cache (call this if you know the bundle has changed)
   * @public
   */
  clearBundleCache() {
    this._bundleGroupsCache = null;
    this._bundleCacheKey = null;
    this._questionnaireIndexCache = null;
    this._questionnaireIndexCacheKey = null;
  }

  /**
   * Update the patient bundle and clear the cache
   * @public
   */
  updatePatientBundle(newBundle) {
    this.patientBundle = newBundle;
    this.clearBundleCache();
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
  /**
   * Index questionnaires in bundle with caching
   * @private
   */
  indexQuestionnairesInBundle(bundleOverride) {
    // Check if we can use cached index
    const currentCacheKey = this._getBundleCacheKey(bundleOverride);
    const indexCacheKey = `qindex_${currentCacheKey}`;

    if (this._questionnaireIndexCache && this._questionnaireIndexCacheKey === indexCacheKey) {
      return this._questionnaireIndexCache;
    }

    const idx = Object.create(null);
    for (const q of this._bundleEntries(bundleOverride)) {
      if (!q) continue;

      if (normalizeStr(q.resourceType) === normalizeStr(RT_QR)) {
        if (q.questionnaire) {
          const questionnaireId = this.questionnaireIDFromQR(q);
          if (!idx[questionnaireId]) {
            if (questionnaireConfig[questionnaireId]) {
              idx[questionnaireId] = buildQuestionnaire([], questionnaireConfig[questionnaireId]);
            } else {
              idx[questionnaireId] = {
                resourceType: "Questionnaire",
                id: questionnaireId,
                name: questionnaireId,
              };
            }
          }
        }
        continue;
      }

      if (normalizeStr(q.resourceType) !== normalizeStr(RT_Q)) continue;

      if (q.id) idx[q.id] = q;
      if (q.name) idx[normalizeStr(q.name)] = q;
      if (q.url) idx[q.url] = q;
    }

    // Cache the index
    this._questionnaireIndexCache = idx;
    this._questionnaireIndexCacheKey = indexCacheKey;

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
    const normalizedA = normalizeLinkId(a);
    const normalizedB = normalizeLinkId(b);
    const resolvedConfig = this._resolveConfig(config);
    return linkIdEquals(normalizedA, normalizedB, resolvedConfig.linkIdMatchMode ?? "fuzzy");
  }

  isHelpQuestionItem(item) {
    if (!item) return false;
    return (
      !isEmptyArray(item.extension) &&
      item.extension.find((ext) => ext.valueCodeableConcept?.coding?.find((coding) => coding.code === "help"))
    );
  }

  isValueExpressionQuestionItem(item) {
    if (!item) return false;
    return (
      !isEmptyArray(item.extension) &&
      item.extension.find((o) => o.valueExpression && o.url?.includes("calculatedExpression"))
    );
  }

  isResponseQuestionItem(item, config = {}) {
    if (!item) return false;
    if (item.readOnly) return false;
    if (this.isValueExpressionQuestionItem(item)) return false;

    const linkId = String(item.linkId).toLowerCase();

    if (EXCLUDED_LINK_ID_KEYWORDS.some((keyword) => linkId === keyword || linkId.includes(keyword))) {
      return false;
    }

    if (item.type && !this.responseAnswerTypes.has(item.type)) return false;

    const resolvedConfig = this._resolveConfig(config);
    const patterns = (resolvedConfig?.excludeQuestionLinkIdPatterns ?? []).map((s) => String(s).toLowerCase());

    if (patterns.some((p) => linkId.includes(p))) return false;

    return true;
  }

  isNonScoreLinkId(linkId, config = {}) {
    if (!linkId) return false;
    if (config?.questionLinkIds?.indexOf(linkId) !== -1) return true;
    const subScoreQuestionIds = !isEmptyArray(config?.subScoringQuestions)
      ? config.subScoringQuestions.map((o) => o.linkId)
      : [];
    const scoringLinkId = getScoringLinkIdFromConfig(config);
    return !linkIdEquals(linkId, scoringLinkId) && !subScoreQuestionIds.find((id) => linkIdEquals(id, linkId));
  }

  // -------------------- Questionnaire matching --------------------
  questionnaireRefMatches(canonical, config) {
    const resolvedConfig = this._resolveConfig(config);
    const ref = normalizeStr(canonical);
    const key = normalizeStr(resolvedConfig.key);
    const id = normalizeStr(resolvedConfig.questionnaireId);
    const name = normalizeStr(resolvedConfig.questionnaireName);
    const url = normalizeStr(resolvedConfig.questionnaireUrl);

    if ((resolvedConfig.questionnaireMatchMode ?? "fuzzy") === "strict") {
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
      //console.warn("getAnswerValueByExtension: questionnaire or questionnaire.item is missing.");
      return null;
    }
    if (!code) {
      //console.warn("getAnswerValueByExtension: code parameter is required");
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
    // if (found === null) {
    //   console.warn(`getAnswerValueByExtension: no value found for code "${code}"`);
    // }
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
      const fromExt = this.getAnswerValueByExtension(questionnaire, coding.code);
      if (fromExt != null && isNumber(fromExt)) return fromExt;
      const codeKey = String(coding.code).toLowerCase();
      if (fallbackScoreMap[codeKey] != null) return fallbackScoreMap[codeKey];
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
    const resolvedConfig = this._resolveConfig(config);
    if (
      isEmptyArray(questionnaireItems) ||
      !questionnaireItems.some((item) => responseItemsFlat?.find((o) => o.linkId === item.linkId))
    )
      return this.responsesOnly(responseItemsFlat, resolvedConfig);

    if (isEmptyArray(responseItemsFlat)) return [];
    const configToUse = resolvedConfig;
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
      if (this.isHelpQuestionItem(q)) returnObject.isHelp = true;
      returnObject.question =
        q.text ?? (matchedResponseItem ? this._getQuestion(matchedResponseItem, configToUse) : `Question ${q.linkId}`);
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
    const CNICS_LABEL = "CNICS",
      EPIC_LABEL = "EPIC";
    if (!isEmptyArray(resource.extension)) {
      const match = resource.extension.find((node) => String(node.url).toLowerCase().includes("epic"));
      if (match) {
        source = EPIC_LABEL;
      }
    }
    if (!isEmptyArray(resource.identifier)) {
      let match = resource.identifier.find((node) => String(node.system).toLowerCase().includes("epic"));
      if (match) {
        source = EPIC_LABEL;
      }
      match = resource.identifier.find((node) => String(node.system).toLowerCase().includes("cnics"));
      if (match) {
        source = CNICS_LABEL;
      }
    }
    if (isPlainObject(resource.identifier)) {
      if (resource.identifier?.system) {
        source = String(resource.identifier.system).toLowerCase().includes("cnics")
          ? CNICS_LABEL
          : String(resource.identifier.system).toLowerCase().includes("epic")
            ? EPIC_LABEL
            : "";
      }
    }
    if (!source) return EPIC_LABEL;
    return source;
  }

  getScoreStatsFromQuestionnaireResponse(qr, questionnaire, config = {}) {
    if (!qr) return null;

    const flat = this.flattenResponseItems(qr.item);

    const stats = calculateQuestionnaireScore(questionnaire, flat, config, this);
    const { score, rawScore, subScores, scoringQuestionScore, scoreLinkIds } = stats;

    let totalItems = scoreLinkIds?.length ?? 0;

    // Count answered among the scoreLinkIds (which come from the Questionnaire and exclude readOnly/valueExpression)
    let totalAnsweredItems = (scoreLinkIds || []).reduce((n, linkId) => {
      const it = this.findResponseItemByLinkId(flat, linkId, config);
      return n + (this.firstAnswer(it) != null ? 1 : 0);
    }, 0);

    if (totalItems === 0 && score != null) totalItems = 1;
    if (totalAnsweredItems === 0 && score != null) totalAnsweredItems = 1;

    return { ...stats, score, rawScore, subScores, scoringQuestionScore, totalAnsweredItems, totalItems };
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
      const { score, rawScore, subScores, scoringQuestionScore, totalAnsweredItems, totalItems } =
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
        columnDisplayDate:
          `${getLocaleDateStringFromDate(qr.authored, "YYYY-MM-DD HH:mm")} ${source ? "\n\r" + source : ""}`.trim(),
        source,
        responses,
        rawScore,
        score,
        scoringQuestionScore,
        subScores,
        ...(subScores ?? {}),
        totalItems,
        totalAnsweredItems,
        authoredDate: qr.authored,
        lastUpdated: qr.meta?.lastUpdated,
        config: config,
        questionnaire,
        questionnaireResponse: qr,
        patientBundle: this.patientBundle,
      };
    });

    return this.sortByNewestAuthoredOrUpdated(rows);
  }

  // -------------------- Loader plumbing (bundle-aware) --------------------
  _isPromise(x) {
    return !!x && typeof x.then === "function";
  }
  _getAnswer(response, config) {
    const o = new Response(response, config);
    return o.answerText ? o.answerText : "--";
  }
  _getQuestion(item, config) {
    const o = new Response(item, config);
    return o.questionText;
  }
  _hasResponseData(data) {
    return !isEmptyArray(data) && !!data.find((item) => !isEmptyArray(item.responses));
  }
  _hasScoreData(data) {
    return (
      !isEmptyArray(data) &&
      !data.find((item) => item.displayMeaningNotScore) &&
      !!data.find((item) => item.score != null)
    );
  }
  _hasMeaningOnlyData(data) {
    return !isEmptyArray(data) && data.find((item) => item.displayMeaningNotScore);
  }

  _getAnswerByTargetLinkIdFromResponseData(targetLinkId, responseData, responses_id, config = {}) {
    const matchResponseData = (responseData || []).find((item) => item.id === responses_id);
    if (!matchResponseData || isEmptyArray(matchResponseData.responses)) return "--";
    const answerItem = matchResponseData.responses.find((o) => this.isLinkIdEquals(o?.id, targetLinkId, config));
    return this._getAnswer(answerItem, config);
  }

  _formatColumnChunks = (columns = [], chunkSize = 3) => {
    if (!columns) return [];
    const [header, ...rest] = columns;
    const chunks = [];
    for (let i = 0; i < rest.length; i += chunkSize) {
      const chunk = rest.slice(i, i + chunkSize);
      chunks.push({
        columns: [header, ...chunk],
      });
    }

    return chunks;
  };

  _formatScoringSummaryData = (data, opts = {}) => {
    if (isEmptyArray(data) || !this._hasResponseData(data)) return null;
    const subtitle = opts?.config?.subtitle ? getNormalizedRowTitleDisplay(opts?.config?.subtitle, data[0]) : "";
    const scoreParams = getScoreParamsFromResponses(data, opts?.config);
    const dataProps = { responses: data[0].responses, ...data[0], ...scoreParams };
    const displayMeaningOnly = this._hasMeaningOnlyData(data);
    const responseColumns = getResponseColumns(data, data[0]);
    const tableResponseData = opts?.tableResponseData ?? this._formatTableResponseData(data);
    return {
      ...data[0],
      ...scoreParams,
      comparisonIcon: displayMeaningOnly
        ? null
        : getComparisonDisplayIconByRow(dataProps, { fontSize: "small", sx: { verticalAlign: "middle" } }),
      numAnsweredDisplay: getNumAnsweredDisplayByRow(dataProps),
      scoreRangeDisplay: getScoreRangeDisplayByRow(dataProps),
      rowTitle: getTitleByRow(dataProps),
      subtitle,
      displayMeaningOnly,
      hasData: !isEmptyArray(data),
      responseColumns,
      printColumnChunks: this._formatColumnChunks(responseColumns, 3),
      responseData: data,
      tableResponseData,
      questionnaire: getQuestionnaireFromRowData(
        data[0],
        getResourcesByResourceType(this.patientBundle, "Questionnaire"),
      ),
    };
  };

  _formatTableResponseData = (data, config) => {
    if (isEmptyArray(data) || !this._hasResponseData(data)) return null;

    const formattedData = data.map((item) => {
      return { ...item, raw: item };
    });

    // Use the row with max responses as the "schema"
    const anchorRowData = [...data].sort((a, b) => (b.responses?.length || 0) - (a.responses?.length || 0))[0];
    if (!anchorRowData || isEmptyArray(anchorRowData.responses)) return null;

    // Resolve config
    let resolvedConfig = config;
    if (!resolvedConfig) {
      if (data[0].questionnaireId) resolvedConfig = questionnaireConfig[data[0].questionnaireId];
    }

    // Build a set of all question ids
    let questionLinkIds = [];
    if (resolvedConfig && resolvedConfig.questionLinkIds) {
      questionLinkIds = resolvedConfig.questionLinkIds;
    }

    if (isEmptyArray(questionLinkIds)) {
      questionLinkIds = Array.from(new Set(anchorRowData.responses.map((r) => r.id).filter((id) => id != null)));
    }

    // Create lookup maps
    // Build a map for quick response lookups by linkId for each data item
    const responseLookupByDataId = new Map();
    for (const dataItem of data) {
      const responseMap = new Map();
      for (const response of dataItem.responses || []) {
        if (response.id) {
          responseMap.set(response.id, response);
        }
      }
      responseLookupByDataId.set(dataItem.id, responseMap);
    }

    // Build a map for finding sample responses by linkId
    const sampleResponseMap = new Map();

    // First, try anchor row
    for (const response of anchorRowData.responses || []) {
      if (response.id && !sampleResponseMap.has(response.id)) {
        sampleResponseMap.set(response.id, response);
      }
    }

    // Then fill in gaps from other data items
    for (const dataItem of data) {
      for (const response of dataItem.responses || []) {
        if (response.id && !sampleResponseMap.has(response.id)) {
          sampleResponseMap.set(response.id, response);
        }
      }
    }
    //

    const result = [...questionLinkIds]
      .map((questionId) => {
        const row = {};

        // Get sample response from lookup map (O(1) instead of O(n))
        let sample = sampleResponseMap.get(questionId);

        // If not found in map, try fuzzy matching (fallback for non-exact matches)
        if (!sample) {
          sample =
            (anchorRowData.responses || []).find((r) => this.isLinkIdEquals(r.id, questionId, resolvedConfig)) ||
            (
              data.find((d) => (d.responses || []).some((r) => this.isLinkIdEquals(r.id, questionId, resolvedConfig)))
                ?.responses || []
            ).find((r) => this.isLinkIdEquals(r.id, questionId, resolvedConfig));
        }

        row.id = questionId;
        row.linkId = questionId;

        // Get question text
        let question = "";
        const questionnaireItem = getQuestionnaireItemByLinkId(anchorRowData.questionnaire, questionId);
        if (questionnaireItem) {
          question = this._getQuestion(questionnaireItem);
        }

        row.question = sample
          ? this._getQuestion(sample, resolvedConfig)
          : question
            ? question
            : `Question ${questionId}`;

        row.source = sample?.source;
        row.readOnly = sample?.readOnly || false;
        row.isValueExpression = sample?.isValueExpression || false;
        row.isHelp = sample?.isHelp || false;
        row.config = resolvedConfig;

        // Use lookup maps for fast answer retrieval (O(1) instead of O(n*m))
        for (const dataItem of formattedData) {
          const responseMap = responseLookupByDataId.get(dataItem.id);

          // Try exact match first from lookup map
          let matchedResponse = responseMap?.get(sample?.id);

          // Fallback to fuzzy matching if needed
          if (!matchedResponse && sample?.id) {
            const matchResponseData = data.find((item) => item.id === dataItem.id);
            if (matchResponseData && !isEmptyArray(matchResponseData.responses)) {
              matchedResponse = matchResponseData.responses.find((r) =>
                this.isLinkIdEquals(r?.id, sample.id, resolvedConfig),
              );
            }
          }

          row[dataItem.id] = matchedResponse ? this._getAnswer(matchedResponse, resolvedConfig) : "--";
          row[`${dataItem.id}_data`] = getScoreParamsFromResponses([dataItem], resolvedConfig);
        }

        return row;
      })
      .filter((r) => !r.isValueExpression && !r.isHelp);

    const hasMeaningOnly = !resolvedConfig?.skipMeaningScoreRow && this._hasMeaningOnlyData(data);
    const hasScoreOnly = !resolvedConfig?.skipMeaningScoreRow && this._hasScoreData(data);

    if (hasMeaningOnly || hasScoreOnly) {
      const questionRow = {
        question:
          "Questions" +
          (resolvedConfig?.subtitle && !resolvedConfig.disableHeaderRowSubtitle
            ? "\n ( " + getNormalizedRowTitleDisplay(resolvedConfig.subtitle) + " )"
            : ""),
        id: `question_${data.map((o) => o.id).join("")}`,
        config: resolvedConfig,
      };
      for (const item of data) {
        questionRow[item.id] = {
          score: " ",
          meaning: null,
        };
      }
      result.unshift(questionRow);
    }

    // Add meaning/score rows
    if (hasMeaningOnly) {
      const meaningRow = {
        question: resolvedConfig?.meaningRowLabel ? resolvedConfig.meaningRowLabel : "Score / Meaning",
        id: `meaning_${data.map((o) => o.id).join("")}`,
        config: resolvedConfig,
      };
      for (const item of data) {
        meaningRow[item.id] = {
          ...getScoreParamsFromResponses([item], resolvedConfig),
          hasMeaningOnly: true,
        };
      }
      result.unshift(meaningRow);
    } else if (hasScoreOnly) {
      const scoringRow = {
        question: "Score / Meaning",
        id: `score_${data.map((o) => o.id).join("")}`,
        config: resolvedConfig,
      };
      for (const item of data) {
        scoringRow[item.id] = {
          ...getScoreParamsFromResponses([item], resolvedConfig),
          score: item.score,
          meaning: item.meaning,
        };
      }
      result.unshift(scoringRow);
    }

    return result;
  };

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

  /**
   * Build synthetic QuestionnaireResponses containing only a single question from host responses.
   *
   * This enables "derived" instruments where one question from a larger questionnaire
   * (e.g., PHQ-9's suicide ideation question) is extracted to create a standalone instrument
   * (e.g., CIRG-SI for suicide risk screening).
   *
   * @param {Array} hostQrs - Array of QuestionnaireResponse resources from the host instrument
   * @param {Object} options - Derivation configuration
   * @param {string} options.linkId - The linkId of the question to extract (e.g., "/44260-8")
   * @param {string} options.targetQuestionnaireId - ID for the derived questionnaire (e.g., "CIRG-SI")
   * @param {Function} [options.normalizeAnswerToCoding] - Function to convert answers to FHIR coding format
   *
   * @returns {Array} Array of synthetic QuestionnaireResponse resources, one per host response,
   *                  each containing only the specified linkId question
   *
   * @example
   * // Extract PHQ-9 question 9 (suicide ideation) to create CIRG-SI responses
   * const cirgSiResponses = builder.buildDerivedSingleLinkQrs(phq9Responses, {
   *   linkId: "/44260-8",
   *   targetQuestionnaireId: "CIRG-SI",
   *   normalizeAnswerToCoding: (answer) => ({
   *     valueCoding: {
   *       system: "http://loinc.org",
   *       code: answer,
   *       display: answer
   *     }
   *   })
   * });
   *
   * @private
   */
  buildDerivedSingleLinkQrs(
    hostQrs = [],
    {
      linkId,
      targetQuestionnaireId,
      normalizeAnswerToCoding = (ans) => {
        // Default: map free-text to valueCoding(code/display = lowercased text)
        if (isNonEmptyString(ans) && DEFAULT_VAL_TO_LOIN_CODE[normalizeStr(ans.toLowerCase())]) {
          return { valueCoding: DEFAULT_VAL_TO_LOIN_CODE[normalizeStr(ans.toLowerCase())] };
        }
        const display = String(ans ?? "");
        const code = display.trim().toLowerCase();
        return { valueCoding: { system: "local/derived", code, display } };
      },
    } = {},
  ) {
    // Early validation
    if (!linkId || !targetQuestionnaireId) return [];

    // Normalize input QRs
    const formattedQrs = (hostQrs || [])
      .map((qr) => qr.resource || qr)
      .filter((qr) => qr.resourceType === "QuestionnaireResponse");

    const derivedResponses = [];

    for (const qr of formattedQrs) {
      // Skip QRs without authored date
      if (!qr.authored) continue;

      // Find the target item by linkId
      const targetItem = (qr.item || []).find((item) => this.isLinkIdEquals(item.linkId, linkId));

      // Skip if target item not found
      if (!targetItem) continue;

      // Normalize answer to FHIR value[x] format
      const normalizedAnswers = this._normalizeAnswersForDerivedQr(targetItem, normalizeAnswerToCoding);

      // Build synthetic QuestionnaireResponse
      const syntheticQr = this._buildSyntheticQuestionnaireResponse(
        qr,
        targetQuestionnaireId,
        linkId,
        targetItem,
        normalizedAnswers,
      );

      derivedResponses.push(syntheticQr);
    }

    return derivedResponses;
  }

  // Helper method to normalize answers (extract logic for clarity)
  _normalizeAnswersForDerivedQr(targetItem, normalizeAnswerToCoding) {
    // Handle proper FHIR shape (array of answer objects)
    if (Array.isArray(targetItem.answer) && targetItem.answer.length && typeof targetItem.answer[0] === "object") {
      return targetItem.answer;
    }

    // Handle flattened/non-FHIR shape (e.g., answer: "Nearly every day")
    return [normalizeAnswerToCoding(targetItem.answer)];
  }

  // Helper method to build synthetic QR (extract logic for clarity)
  _buildSyntheticQuestionnaireResponse(originalQr, targetQuestionnaireId, linkId, targetItem, normalizedAnswers) {
    return {
      resourceType: "QuestionnaireResponse",
      id: `${originalQr.id}_${targetQuestionnaireId}`,
      identifier: originalQr.identifier,
      meta: originalQr.meta,
      questionnaire: `Questionnaire/${targetQuestionnaireId}`,
      status: "completed",
      subject: originalQr.subject,
      authored: originalQr.authored,
      author: originalQr.author,
      item: [
        {
          linkId,
          // text: (targetItem.text ? targetItem.text.replace(/\s*\([^)]*\)/g, "").trim() : null) || linkId,
          text: (targetItem.text ? targetItem.text : null) || linkId,
          answer: normalizedAnswers,
        },
      ],
    };
  }

  /**
   * Generate summaries from questionnaire responses with optional derived response support.
   *
   * This method handles both direct questionnaire responses and "derived" responses where
   * a single question from a host questionnaire (e.g., PHQ-9 suicide ideation question)
   * is extracted to create responses for a derived instrument (e.g., CIRG-SI).
   *
   * @param {Array} questionnaireResponses - Array of FHIR QuestionnaireResponse resources
   * @param {Object} questionnaire - FHIR Questionnaire resource definition
   * @param {Object} options - Configuration options
   * @param {Object} [options.strategyOptions] - Options passed to specialized summarizers (SLUM, CIDAS, etc.)
   *
   * @returns {Object} Summary object containing:
   *   - config: Merged configuration
   *   - chartConfig: Chart visualization parameters
   *   - chartData: Formatted data for charting
   *   - chartType: Type of chart to render
   *   - responseData: Processed response data
   *   - scoringSummaryData: Aggregated scoring information
   *   - tableResponseData: Data formatted for table display
   *   - questionnaire: The questionnaire definition
   *   - key: Unique identifier for the questionnaire
   *   - error: Error message if processing failed
   *
   * @example
   * // Direct usage with PHQ-9 responses
   * const summary = builder._summariesByQuestionnaireRef(phq9Responses, phq9Questionnaire);
   *
   * @example
   * // Derived usage - automatically extracts suicide ideation question from PHQ-9
   * const cirgSiConfig = {
   *   deriveFrom: {
   *     linkId: "/44260-8",
   *     hostIds: ["PHQ-9"],
   *     normalizeAnswerToCoding: (ans) => ({ valueCoding: { code: ans, display: ans }})
   *   }
   * };
   * const summary = builder._summariesByQuestionnaireRef(phq9Responses, cirgSiQuestionnaire);
   */

  _summariesByQuestionnaireRef(questionnaireResponses, questionnaire, options = {}) {
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
      const looksLikeHost = (responses) =>
        (responses || []).some((response) => {
          const questionnaireRef = response?.resource?.questionnaire || response?.questionnaire || "";
          return hostIds.some((hostId) =>
            this.questionnaireRefMatches(questionnaireRef, {
              questionnaireId: hostId,
              questionnaireMatchMode: "fuzzy",
            }),
          );
        });

      hasHostMatch = looksLikeHost(questionnaireResponses);

      if (!questionnaireResponses?.length || hasHostMatch) {
        // We need host QRs. If caller gave us host QRs directly, use them.
        // Otherwise pull them from the bundle groups this instance can see.
        let hostQuestionnaireResponses = [];

        if (hasHostMatch) {
          hostQuestionnaireResponses = questionnaireResponses;
        } else {
          // This will only recompute if the bundle has actually changed
          const bundleGroups = this.fromBundleGrouped({ completedOnly: true });

          for (const canonicalRef of Object.keys(bundleGroups)) {
            const matchesHost = hostIds.some((hostId) =>
              this.questionnaireRefMatches(canonicalRef, {
                questionnaireId: hostId,
                questionnaireMatchMode: "fuzzy",
              }),
            );

            if (matchesHost) {
              hostQuestionnaireResponses.push(...bundleGroups[canonicalRef]);
              hasHostMatch = true;
            }
          }
        }

        // Build synthetic QRs carrying only the target linkId for THIS instrument
        const derivedQuestionnaireResponses = this.buildDerivedSingleLinkQrs(hostQuestionnaireResponses, {
          linkId,
          targetQuestionnaireId: questionnaire?.id || config?.questionnaireId || config?.key || "DERIVED",
          normalizeAnswerToCoding,
        });

        // Swap in derived QRs for the rest of the pipeline
        questionnaireResponses = derivedQuestionnaireResponses;
      }
    }
    // === END derived ===========================================================

    // choose summarization strategy
    const strategyMap = {
      SLUM: "summarizeSLUM",
      CIDAS: "summarizeCIDAS",
      MINICOG: "summarizeMiniCog",
    };

    const selectedStrategyKey = Object.keys(strategyMap).find((key) => this.questionnaireRefMatches(key, config));

    const evaluationData = selectedStrategyKey
      ? this[strategyMap[selectedStrategyKey]](questionnaireResponses, questionnaire, options)
      : this.getResponsesSummary(questionnaireResponses, questionnaire);

    // compute scoring/series/params/chart domain/etc.
    const scoringData =
      !config?.skipChart && !isEmptyArray(evaluationData)
        ? evaluationData.filter(
            (item) =>
              item &&
              !isEmptyArray(item.responses) &&
              (isNumber(item.score) || item.subScores) &&
              isValidDate(item.date),
          )
        : null;

    const chartConfig = getChartConfig(questionnaire?.id);
    let chartData = !isEmptyArray(scoringData)
      ? scoringData.map((item, index) => ({
          ...item,
          ...getScoreParamsFromResponses(scoringData.slice(index), config),
          id: item.id + "_" + item.instrumentName + "_" + index,
          total: isNumber(item.score) ? item.score : null,
        }))
      : null;

    let xDomain;
    if (chartData && chartConfig?.dataFormatter) {
      chartData = chartConfig.dataFormatter(chartData);
      const dateArray = !isEmptyArray(chartData) ? chartData?.map((dataPoint) => dataPoint.date) : [];
      const uniqueDates = !isEmptyArray(dateArray) ? [...new Set(dateArray)] : [];
      xDomain = getDateDomain(uniqueDates, { padding: uniqueDates.length <= 2 ? 0.15 : 0.05 });
    }

    const { key, id, ...restOfConfig } = config ?? {};
    const chartParams = { ...chartConfig, ...restOfConfig, ...(restOfConfig?.chartParams ?? {}), xDomain };
    const tableResponseData = this._formatTableResponseData(evaluationData, config);
    const scoringSummaryData = this._formatScoringSummaryData(evaluationData, {
      tableResponseData,
      config,
    });

    return {
      config,
      chartConfig: chartParams,
      chartData: { ...chartParams, data: chartData },
      chartType: chartConfig?.type,
      responseData: evaluationData,
      scoringSummaryData,
      tableResponseData,
      questionnaire,
      key: questionnaire?.id,
      error: !questionnaire
        ? "No associated questionnaire found"
        : !hasHostMatch
          ? "No host questionnaire responses found"
          : "",
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
