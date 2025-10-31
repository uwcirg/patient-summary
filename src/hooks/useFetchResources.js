import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery } from "react-query";
import {
  getFHIRResourcePath,
  getFhirResourcesFromQueryResult,
  getFlowSheetObservationURLS,
  getCodeableCodesFromObservation,
  normalizeLinkId,
  processPage,
  getResourceTypesFromResources,
  getFHIRResourceTypesToLoad,
  getFHIRResourcePaths,
} from "@util/fhirUtil";
import { fuzzyMatch, getEnvQuestionnaireList, getDisplayQTitle, getEnv, isDemoDataEnabled, isEmptyArray } from "@util";
import questionnaireConfigs from "@config/questionnaire_config";
import {
  buildQuestionnaire,
  buildReportData,
  buildScoringSummaryRows,
  observationsToQuestionnaireResponses,
} from "@models/resultBuilders/helpers";
import QuestionnaireScoringBuilder from "@models/resultBuilders/QuestionnaireScoringBuilder";
import demoData from "@/data/demoData";
import { FhirClientContext } from "@/context/FhirClientContext";
import { NO_CACHE_HEADER } from "@/consts";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------
const SUMMARY_DATA_KEY = "summaryData";
const QUESTIONNAIRE_DATA_KEY = "Questionnaire";
const QUESTIONNAIRE_RESPONSES_DATA_KEY = "QuestionnaireResponse";
const OBSERVATION_DATA_KEY = "Observation";

const BLOCKED_EXTRA_TYPES = new Set([
  QUESTIONNAIRE_DATA_KEY.toLowerCase(),
  QUESTIONNAIRE_RESPONSES_DATA_KEY.toLowerCase(),
]);

const DEFAULT_QUERY_PARAMS = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: false,
};

// Single-flight cache for phase-1 (per patient+run)
const PHASE1_FLIGHTS = new Map();
function runPhase1Once(key, fn) {
  if (PHASE1_FLIGHTS.has(key)) return PHASE1_FLIGHTS.get(key);
  const p = (async () => {
    try {
      return await fn();
    } finally {
      // keep cached; delete if you want re-runs post-settle:
      // PHASE1_FLIGHTS.delete(key);
    }
  })();
  PHASE1_FLIGHTS.set(key, p);
  return p;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const normalizeType = (t) => String(t).replace(/\s+/g, "").toLowerCase();
const shouldTrack = (typeSet, typeName) => typeSet.has(normalizeType(typeName));
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const toStringArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const safeDateMs = (d) => {
  const ms = new Date(d ?? "").getTime();
  return Number.isFinite(ms) ? ms : 0;
};

function uniqueNormalized(list) {
  const exists = new Set();
  const out = [];
  for (const t of list) {
    const n = normalizeType(t);
    if (exists.has(n)) continue;
    exists.add(n);
    out.push(t);
  }
  return out;
}

function computePlannedExtras(configuredTypesRaw) {
  return uniqueNormalized(
    configuredTypesRaw.filter((t) => {
      const n = normalizeType(t);
      return !BLOCKED_EXTRA_TYPES.has(n);
    }),
  );
}

function getSummaries(bundle) {
  let summaries = new QuestionnaireScoringBuilder({}, bundle).summariesByQuestionnaireFromBundle();
  const summaryDataKeys = Object.keys(summaries);
  const qList = getEnvQuestionnaireList();
  if (!qList) return summaries;
  qList.forEach((qKey) => {
    const hitKey = summaryDataKeys.find((key) => fuzzyMatch(key, qKey));
    if (hitKey) return;
    summaries[qKey] = null;
  });
  return summaries;
}

// -----------------------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------------------
function reducer(state, action) {
  const { scope, type } = action;
  const actionType = String(type).toUpperCase();

  if (scope === "base") {
    switch (actionType) {
      case "RESULTS":
        return {
          ...state,
          base: {
            ...state.base,
            questionnaireList: action.questionnaireList ?? state.base.questionnaireList,
            questionnaires: action.questionnaires ?? [],
            questionnaireResponses: action.questionnaireResponses ?? [],
            exactMatchById: !!action.exactMatchById,
            summaries: action.summaries ?? state.base.summaries,
            complete: true,
            error: false,
            errorMessage: "",
          },
        };
      case "ERROR":
        return {
          ...state,
          base: {
            ...state.base,
            error: true,
            errorMessage: action.errorMessage ?? String(action.message ?? "Error occurred."),
            complete: true,
          },
        };
      case "RESET":
        return {
          ...state,
          base: {
            questionnaireList: [],
            questionnaires: [],
            questionnaireResponses: [],
            exactMatchById: state.base.exactMatchById,
            summaries: {},
            complete: false,
            error: false,
            errorMessage: "",
          },
        };
      default:
        return state;
    }
  }

  if (scope === "loader") {
    switch (actionType) {
      case "UPSERT_MANY": {
        const map = new Map(state.loader.map((r) => [r.id, r]));
        for (const it of action.items) map.set(it.id, { ...(map.get(it.id) || {}), ...it });
        return { ...state, loader: Array.from(map.values()) };
      }

      case "COMPLETE":
        // If SUMMARY row completed, mirror into base.summaries
        if (action.id === SUMMARY_DATA_KEY) {
          return {
            ...state,
            base: {
              ...state.base,
              summaries: action.data || {}, // <- keep base in sync
            },
            loader: state.loader.map((r) =>
              r.id === action.id ? { ...r, data: action.data ?? r.data, complete: true, error: false } : r,
            ),
          };
        }
        return {
          ...state,
          loader: state.loader.map((r) =>
            r.id === action.id ? { ...r, data: action.data ?? r.data, complete: true, error: false } : r,
          ),
        };

      case "ERROR":
        return {
          ...state,
          loader: state.loader.map((r) =>
            r.id === action.id
              ? {
                  ...r,
                  complete: true,
                  error: true,
                  errorMessage:
                    (r.errorMessage ? r.errorMessage + " | " : "") +
                    (action.errorMessage || String(action.reason || "fetch resource error")),
                }
              : r,
          ),
        };

      case "RESET":
        return { ...state, loader: [] };

      default:
        return state;
    }
  }

  if (actionType === "RESET_ALL") {
    return {
      base: {
        questionnaireList: [],
        questionnaires: [],
        questionnaireResponses: [],
        exactMatchById: state.base.exactMatchById,
        summaries: {},
        complete: false,
        error: false,
        errorMessage: "",
      },
      loader: [],
    };
  }

  return state;
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------
export default function useFetchResources() {
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
  // recompute configured types when mounted (config is static at runtime)
  const configuredTypesRaw = useMemo(() => getFHIRResourceTypesToLoad().flat().map(String).filter(Boolean), []);
  const configuredTypeSet = useMemo(() => new Set(configuredTypesRaw.map(normalizeType)), [configuredTypesRaw]);
  const plannedExtras = useMemo(() => computePlannedExtras(configuredTypesRaw), [configuredTypesRaw]);
  const { client, patient } = useContext(FhirClientContext);

  // unified reducer + state
  const initialBaseState = {
    questionnaireList: [],
    questionnaires: [],
    questionnaireResponses: [],
    exactMatchById: isFromEpic,
    summaries: {},
    complete: false,
    error: false,
    errorMessage: "",
  };

  const getInitTrackItems = () => {
    const items = [];
    const wantQ = shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY);
    const wantQR = shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);

    if (wantQ) items.push({ id: QUESTIONNAIRE_DATA_KEY, title: QUESTIONNAIRE_DATA_KEY, complete: false, error: false });
    if (wantQR) {
      items.push({ id: QUESTIONNAIRE_RESPONSES_DATA_KEY, title: QUESTIONNAIRE_RESPONSES_DATA_KEY, complete: false });
      items.push({ id: OBSERVATION_DATA_KEY, title: OBSERVATION_DATA_KEY, complete: false });
    }

    // Add planned extras (excluding Q/QR/blocked already handled)
    for (const t of plannedExtras) items.push({ id: t, title: t, complete: false, error: false });

    // Always track summary
    items.push({ id: SUMMARY_DATA_KEY, title: "Response Summary Data", complete: false, data: null });
    return items;
  };
  const [state, dispatch] = useReducer(reducer, { base: initialBaseState, loader: getInitTrackItems() });

  // stable scoped dispatchers
  const dispatchBase = useCallback((action) => dispatch({ ...action, scope: "base" }), [dispatch]);
  const dispatchLoader = useCallback((action) => dispatch({ ...action, scope: "loader" }), [dispatch]);

  const base = state.base;
  const toBeLoadedResources = state.loader;

  const [extraTypes, setExtraTypes] = useState([]);
  const [fatalError, setFatalError] = useState(null);

  // stable patient id
  const pid = useMemo(() => (isNonEmptyString(patient?.id) ? String(patient.id) : null), [patient?.id]);

  // refresh bump controls recomputation of configured types
  const [bump, setBump] = useState(0);

  // refresh
  const refresh = useCallback(() => {
    dispatchBase({ type: "RESET" });
    dispatchLoader({ type: "RESET" });
    setFatalError(null);
    setExtraTypes([]);
    if (pid) PHASE1_FLIGHTS.delete(`${pid}::${bump}`);
    setBump((x) => x + 1);
  }, [pid, bump, dispatchBase, dispatchLoader]);

  // Bundle + eval results (kept in ref to avoid re-renders during accumulation)
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [],
    evalResults: {},
  });

  // ---------------------------------------------------------------------------
  // Phase 1
  // ---------------------------------------------------------------------------
  const phase1Key = useMemo(() => (pid ? `${pid}::${bump}` : null), [pid, bump]);
  const phase1KeyRef = useRef(phase1Key);
  useEffect(() => {
    phase1KeyRef.current = phase1Key;
  }, [phase1Key]);

  useQuery(
    ["phase1-qr-obs-q", phase1Key],
    async () => {
      if (!client || !isNonEmptyString(pid)) {
        const msg = "No FHIR client or patient ID provided.";
        setFatalError(msg);
        throw new Error(msg);
      }

      return runPhase1Once(phase1Key, async () => {
        const preloadList = getEnvQuestionnaireList();
        const hasPreload = !isEmptyArray(preloadList);

        let qrResources = [];
        let obResources = [];
        let qResources = [];

        // What we intend to fetch in phase-1
        const wantQ =
          hasPreload ||
          shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY) ||
          shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);
        const wantQR = wantQ || shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);
        const wantObs = wantQ || wantQR;

        const exactMatchById = !hasPreload || isFromEpic;

        // --- Build phase-1 tasks (QR + Obs in parallel; Q also in parallel if preload list is known) ---
        const phase1Tasks = [];

        if (wantQR) {
          phase1Tasks.push({
            id: QUESTIONNAIRE_RESPONSES_DATA_KEY,
            promise: client.request(
              { url: `QuestionnaireResponse?patient=${pid}`, header: NO_CACHE_HEADER },
              { pageLimit: 0, onPage: processPage(client, qrResources) },
            ),
            onErrorMessage: "QuestionnaireResponse request failed",
          });
        }
        if (wantObs) {
          const obURLs = getFlowSheetObservationURLS(pid);
          obURLs.map((url) => {
            phase1Tasks.push({
              id: OBSERVATION_DATA_KEY,
              promise: client.request(
                { url: url, header: NO_CACHE_HEADER },
                { pageLimit: 0, onPage: processPage(client, obResources) },
              ),
              onErrorMessage: `Observation request failed. URL ${url}`,
            });
          });
        }

        // --- Execute phase-1 in parallel ---
        if (phase1Tasks.length) {
          const results = await Promise.allSettled(phase1Tasks.map((t) => t.promise));
          results.forEach((res, i) => {
            const { id, onErrorMessage } = phase1Tasks[i];
            if (res.status === "fulfilled") {
              dispatchLoader({ type: "COMPLETE", id });
            } else {
              dispatchLoader({
                type: "ERROR",
                id,
                errorMessage: res.reason?.message || onErrorMessage || `${id} request failed`,
              });
            }
          });
        }

        // Filter matched QRs by Questionnaire/id presence
        let matchedQRs = !isEmptyArray(qrResources)
          ? qrResources.filter((it) => it && it.questionnaire && it.questionnaire.split("/")[1])
          : [];

        // initially populated with pre-load questionnaire list
        let qIds = [...preloadList];
        // Determine Questionnaire list & fetch (if not already fetched via preload parallel path)
        const matchedQIds = matchedQRs?.map((it) => it.questionnaire?.split("/")[1]) ?? [];
        const uniqueQIds = [...new Set([...qIds, ...matchedQIds])];
        const qListToLoad = hasPreload ? preloadList : uniqueQIds;

        const syntheticQs = [],
          syntheticQRs = [];

        if (wantObs && !isEmptyArray(obResources)) {
          const obsCodes = getCodeableCodesFromObservation(obResources);
          if (!isEmptyArray(obsCodes)) {
            for (const [key, cfg] of Object.entries(questionnaireConfigs || {})) {
              if (!cfg) continue;
              if (hasPreload && !preloadList.find((q) => fuzzyMatch(q, key))) continue;
              const cfgLinkIds = toStringArray([...(cfg.questionLinkIds ?? [])]);
              const hit = cfgLinkIds.find((linkId) => obsCodes.includes(normalizeLinkId(linkId)));
              if (!hit) continue;
              const builtQ = buildQuestionnaire(obResources, cfg);
              const builtQRs = observationsToQuestionnaireResponses(obResources, cfg) || [];
              console.log("builtQ ", builtQ);
              console.log("builtQRs ", builtQRs);
              syntheticQs.push(builtQ);
              syntheticQRs.push(...builtQRs);
              if (cfg.questionnaireId) qIds.push(cfg.questionnaireId);
            }
          }
        }
        matchedQRs = [...matchedQRs, ...syntheticQRs];

        if (wantQ) {
          if (isEmptyArray(qListToLoad)) {
            dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_DATA_KEY });
          } else {
            const qPath = getFHIRResourcePath(pid, QUESTIONNAIRE_DATA_KEY, {
              questionnaireList: qListToLoad,
              exactMatchById: exactMatchById,
            });

            const qTask = {
              id: QUESTIONNAIRE_DATA_KEY,
              promise: client.request(
                { url: qPath, header: NO_CACHE_HEADER },
                { pageLimit: 0, onPage: processPage(client, qResources) },
              ),
              onErrorMessage: "Questionnaire request failed",
            };

            const [qResult] = await Promise.allSettled([qTask.promise]);
            if (qResult.status === "fulfilled") {
              dispatchLoader({ type: "COMPLETE", id: qTask.id });
            } else {
              dispatchLoader({
                type: "ERROR",
                id: qTask.id,
                errorMessage: qResult.reason?.message || qTask.onErrorMessage,
              });
            }
          }
        }

        const questionnaires = [
          ...getFhirResourcesFromQueryResult(syntheticQs),
          ...getFhirResourcesFromQueryResult(qResources),
        ];
        const questionnaireResponses = getFhirResourcesFromQueryResult(matchedQRs);

        // seed bundle
        patientBundle.current = {
          ...patientBundle.current,
          entry: [{ resource: patient }, ...(questionnaireResponses ?? []), ...(questionnaires ?? [])],
        };

        return {
          questionnaires,
          questionnaireResponses,
          qListToLoad,
          exactMatchById: exactMatchById,
        };
      });
    },
    {
      ...DEFAULT_QUERY_PARAMS,
      enabled: !!client && !!pid && !base.complete && !base.error && !!phase1Key,
      onSuccess: (payload) => {
        if (phase1KeyRef.current !== phase1Key) return; // ignore stale result
        const { questionnaires, questionnaireResponses, qListToLoad, exactMatchById } = payload || {};

        // mark base as completed
        setTimeout(
          () =>
            dispatchBase({
              type: "RESULTS",
              questionnaireList: qListToLoad,
              questionnaires,
              questionnaireResponses,
              exactMatchById,
            }),
          250,
        );

        // compute extra resource types for phase-2
        const haveTypes = [
          ...new Set(getResourceTypesFromResources(questionnaires ?? []).map((r) => String(r).toLowerCase())),
          ...new Set(getResourceTypesFromResources(questionnaireResponses ?? []).map((r) => String(r).toLowerCase())),
          "patient",
        ];

        // Which extras are actually needed after phase-1 results
        const extrasWanted = plannedExtras.filter((t) => !haveTypes.includes(normalizeType(t)));

        // Keep needed extras pending (ensure rows exist)
        if (!isEmptyArray(extrasWanted)) {
          dispatchLoader({
            type: "UPSERT_MANY",
            items: extrasWanted.map((t) => ({ id: t, title: t, complete: false, error: false })),
          });
        }

        // Mark *not* needed extras as complete (skipped)
        const extrasSkip = plannedExtras.filter(
          (t) => !extrasWanted.find((w) => normalizeType(w) === normalizeType(t)),
        );
        for (const t of extrasSkip) dispatchLoader({ type: "COMPLETE", id: t, data: [] });

        // If nothing to fetch, summary can finalize now
        if (isEmptyArray(extrasWanted)) {
          dispatchLoader({ type: "COMPLETE", id: SUMMARY_DATA_KEY, data: getSummaries(patientBundle.current.entry) });
          return;
        }

        // Drive phase-2 list
        setExtraTypes(extrasWanted);
      },
      onError: (e) => {
        if (phase1KeyRef.current !== phase1Key) return; // ignore stale error
        dispatchBase({ type: "ERROR", errorMessage: e?.message ?? String(e) });
      },
    },
  );

  // ---------------------------------------------------------------------------
  // Phase 2
  // ---------------------------------------------------------------------------
  const readyForExtras =
    !!client &&
    !!pid &&
    base.complete &&
    !base.error &&
    !isEmptyArray(extraTypes) &&
    !isEmptyArray(toBeLoadedResources);

  const loadedFHIRDataRef = useRef([]);

  const getFhirResources = useCallback(async () => {
    loadedFHIRDataRef.current = [];
    const paths = getFHIRResourcePaths(pid, extraTypes, {
      questionnaireList: base.questionnaireList,
      exactMatchById: base.exactMatchById,
    });

    const requests = paths.map((p) =>
      client
        .request(
          { url: p.resourcePath, header: NO_CACHE_HEADER },
          { pageLimit: 0, onPage: processPage(client, loadedFHIRDataRef.current) },
        )
        .then(() => {
          dispatchLoader({ type: "COMPLETE", id: p.resourceType });
          return loadedFHIRDataRef.current;
        })
        .catch((e) => {
          dispatchLoader({ type: "ERROR", id: p.resourceType, errorMessage: e?.message });
          console.warn("FHIR resource retrieval error for", p.resourceType, e);
          return [];
        }),
    );

    if (!requests.length) return [];
    const settled = await Promise.allSettled(requests);
    let bundle = [];
    for (const res of settled)
      if (res.status === "fulfilled") bundle = [...bundle, ...getFhirResourcesFromQueryResult(res.value)];
    return bundle;
  }, [client, pid, extraTypes, base.questionnaireList, base.exactMatchById, dispatchLoader]);

  useQuery(
    ["extra-fhir-resources", pid, extraTypes.join(","), bump],
    async () => {
      const fhirData = await getFhirResources();
      const { default: FhirResultBuilder } = await import("@/models/resultBuilders/FhirResultBuilder");
      const evalEntries = extraTypes.map((t) => ({ [t]: new FhirResultBuilder(fhirData).build(t) }));
      const evalResults = Object.assign({}, ...(evalEntries ?? []));

      patientBundle.current = {
        ...patientBundle.current,
        entry: [...patientBundle.current.entry, ...fhirData],
        evalResults: { ...patientBundle.current.evalResults, ...evalResults },
      };
      return fhirData;
    },
    {
      ...DEFAULT_QUERY_PARAMS,
      enabled: readyForExtras,
      onSuccess: () => {
        setTimeout(
          () =>
            dispatchLoader({ type: "COMPLETE", id: SUMMARY_DATA_KEY, data: getSummaries(patientBundle.current.entry) }),
          250,
        );
      },
      onError: (e) => {
        dispatchBase({ type: "ERROR", errorMessage: e?.message ?? String(e) });
      },
    },
  );

  // ---------------------------------------------------------------------------
  // Derived helpers & return payload
  // ---------------------------------------------------------------------------
  const phase2DoneOrSkipped =
    isEmptyArray(toBeLoadedResources) || !toBeLoadedResources.find((o) => !o.complete) || !!fatalError;
  const isReady = base.complete && (phase2DoneOrSkipped || isEmptyArray(extraTypes)) && !base.error;

  const summaryData = useMemo(() => {
    const found = toBeLoadedResources.find((r) => r.id === SUMMARY_DATA_KEY);
    if (!found || !found.data || found.error) return null;
    const keys = Object.keys(found.data);
    const hasAnyUseful = !!keys.find(
      (key) => found.data[key] && (found.data[key].error || !isEmptyArray(found.data[key].responseData)),
    );
    return hasAnyUseful ? found : null;
  }, [toBeLoadedResources]);

  const allChartData = useMemo(() => {
    if (!summaryData) return null;
    const dataToUse = summaryData?.data ? JSON.parse(JSON.stringify(summaryData?.data)) : null;
    const keys = Object.keys(dataToUse ?? []);
    const rows = keys.flatMap((key) => {
      const d = dataToUse[key];
      if (!d || isEmptyArray(d.chartData?.data)) return [];
      return d.chartData.data.map((o) => ({ ...o, key, [getDisplayQTitle(key)]: o.score }));
    });
    return rows.sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));
  }, [summaryData]);

  const scoringSummaryData = useMemo(() => {
    if (!summaryData) return null;
    const dataToUse = summaryData?.data;
    return buildScoringSummaryRows(dataToUse);
  }, [summaryData]);

  const reportData = useMemo(() => {
    if (isDemoDataEnabled()) {
      return buildReportData(demoData);
    }
    if (!scoringSummaryData) return null;
    const mapData = new Map(scoringSummaryData?.map((o) => [o.key, o]));
    if (summaryData && summaryData.data) {
      for (const key in summaryData.data) {
        summaryData.data[key].scoringSummaryData = mapData.get(key);
      }
    }
    return buildReportData(summaryData?.data);
  }, [scoringSummaryData, summaryData]);

  const chartKeys = useMemo(() => [...new Set(allChartData?.map((o) => getDisplayQTitle(o.key)))], [allChartData]);
  const loaderErrors = useMemo(() => state.loader.filter((r) => r?.error), [state.loader]);
  const baseData = useMemo(() => base, [base]);
  const errorMessages = [
    ...(base.error ? [base.errorMessage] : []),
    ...(fatalError ? [fatalError] : []),
    ...loaderErrors
      .map((r) => {
        if (r.errorMessage.includes(" | ")) {
          return r.errorMessage.split(" | ").map((m) => `${r.title || r.id}: ${m || "Unknown error"}`);
        }
        return `${r.title || r.id}: ${r.errorMessage || "Unknown error"}`;
      })
      .flat(),
  ];

  const hasError = errorMessages.length > 0;
  const errorSeverity = fatalError ? "error" : "warning";

  if (isReady) {
    console.log("summaryData ", summaryData);
    // console.log("evalData ", patientBundle.current.evalResults);
    // console.log("scoringSummaryData ", scoringSummaryData);
    // console.log("reportData ", reportData);
  }

  return {
    ...(patientBundle.current.evalResults ? patientBundle.current.evalResults : {}),
    isReady,
    errorMessages,
    errorSeverity,
    fatalError,
    hasError,
    summaryError: base.error,
    // to be loaded resources tracking
    toBeLoadedResources,

    // base (phase 1)
    questionnaireList: baseData?.questionnaireList,
    questionnaires: baseData.questionnaires,
    questionnaireResponses: baseData.questionnaireResponses,
    summaries: baseData.summaries,
    summaryKeys: Object.keys(baseData.summaries),

    // phase 2
    evalData: patientBundle.current.evalResults,

    // bundle
    patientBundle: patientBundle.current.entry,

    // charts
    summaryData,
    scoringSummaryData,
    allChartData,
    chartKeys,

    //reportData
    reportData,

    // controls
    refresh,
  };
}

// Export reducer for unit tests if desired
export { reducer };
