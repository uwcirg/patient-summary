import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery } from "react-query";
import {
  getFHIRResourcePath,
  getFhirResourcesFromQueryResult,
  getFlowsheetIds,
  getLinkIdsFromObservations,
  normalizeLinkId,
  processPage,
  getResourceTypesFromResources,
  getFHIRResourceTypesToLoad,
  getFHIRResourcePaths,
} from "@util/fhirUtil";
import { fuzzyMatch, getEnvQuestionnaireList, getEnv, isEmptyArray } from "@util";
import questionnaireConfigs from "@config/questionnaire_config";
import { buildQuestionnaire, observationsToQuestionnaireResponses } from "@models/resultBuilders/helpers";
import QuestionnaireScoringBuilder from "@models/resultBuilders/QuestionnaireScoringBuilder";
import { FhirClientContext } from "@/context/FhirClientContext";
import { NO_CACHE_HEADER } from "@/consts";

const SUMMARY_DATA_KEY = "summaryData";
const QUESTIONNAIRE_DATA_KEY = "Questionnaire";
const QUESTIONNAIRE_RESPONSES_DATA_KEY = "QuestionnaireResponse";
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

// ---- Single-flight cache for phase-1 (per patient+run) ----
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

// base scope: questionnaire & questionnaire resources
// loader scope: other FHIR resources
function reducer(state, action) {
  const t = String(action.type).toUpperCase();

  if (action.scope === "base") {
    switch (t) {
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
            ...state.base,
            questionnaireList: [],
            questionnaires: [],
            questionnaireResponses: [],
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

  if (action.scope === "loader") {
    switch (t) {
      case "INIT_TRACKING":
        return { ...state, loader: action.items };

      case "UPSERT_MANY": {
        const map = new Map(state.loader.map((r) => [r.id, r]));
        for (const it of action.items) map.set(it.id, { ...(map.get(it.id) || {}), ...it });
        return { ...state, loader: Array.from(map.values()) };
      }

      case "COMPLETE":
        return {
          ...state,
          loader: state.loader.map((r) =>
            r.id === action.id ? { ...r, data: action.data ?? r.data, complete: true } : r,
          ),
        };

      case "ERROR":
        return {
          ...state,
          loader: state.loader.map((r) =>
            r.id === action.id
              ? { ...r, complete: true, error: true, errorMessage: action.errorMessage || String(action.reason || "") }
              : r,
          ),
        };

      case "RESET":
        return { ...state, loader: [] };

      default:
        return state;
    }
  }

  if (t === "RESET_ALL") {
    return {
      ...state,
      base: {
        ...state.base,
        questionnaireList: [],
        questionnaires: [],
        questionnaireResponses: [],
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

function getSummaries(bundle) {
  return new QuestionnaireScoringBuilder({}, bundle).summariesByQuestionnaireFromBundle();
}

// --- helpers for config-driven tracking + guards ---
const normalizeType = (t) => String(t).replace(/\s+/g, "").toLowerCase();
const shouldTrack = (typeSet, typeName) => typeSet.has(normalizeType(typeName));

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const toStringArray = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const safeDateMs = (d) => {
  const ms = new Date(d ?? "").getTime();
  return Number.isFinite(ms) ? ms : 0;
};

export default function useFetchResources() {
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
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
  const [state, dispatch] = useReducer(reducer, { base: initialBaseState, loader: [] });

  // stable scoped dispatchers
  const dispatchBase = useCallback((action) => dispatch({ ...action, scope: "base" }), [dispatch]);
  const dispatchLoader = useCallback((action) => dispatch({ ...action, scope: "loader" }), [dispatch]);

  const base = state.base;
  const toBeLoadedResources = state.loader;

  const [extraTypes, setExtraTypes] = useState([]);
  const [error, setError] = useState(null);

  // stable patient id
  const pid = useMemo(() => (isNonEmptyString(patient?.id) ? String(patient.id) : null), [patient?.id]);

  // refresh bump controls recomputation of configured types
  const [bump, setBump] = useState(0);

  // recompute configured types when patient or refresh changes
  const configuredTypesRaw = useMemo(() => getFHIRResourceTypesToLoad().flat().map(String).filter(Boolean), []);
  const configuredTypeSet = useMemo(() => new Set(configuredTypesRaw.map(normalizeType)), [configuredTypesRaw]);

  // refresh
  const refresh = useCallback(() => {
    dispatchBase({ type: "RESET" });
    dispatchLoader({ type: "RESET" });
    setError(null);
    setExtraTypes([]);
    if (pid) PHASE1_FLIGHTS.delete(`${pid}::${bump}`);
    setBump((x) => x + 1);
  }, [pid, bump, dispatchBase, dispatchLoader]);

  // Bundle + eval results
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [],
    evalResults: {},
  });

  /** -------------------- Phase 1 via React Query (single-flight guarded) -------------------- */
  const phase1Key = useMemo(() => (pid ? `${pid}::${bump}` : null), [pid, bump]);
  const phase1KeyRef = useRef(phase1Key);
  useEffect(() => {
    phase1KeyRef.current = phase1Key;
  }, [phase1Key]);

  // INIT loader rows based on configured types (always include summary)
  useEffect(() => {
    if (!phase1Key) return;

    const items = [];
    const wantQ = shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY);
    const wantQR = shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);

    if (wantQ) {
      items.push({ id: QUESTIONNAIRE_DATA_KEY, title: QUESTIONNAIRE_DATA_KEY, complete: false, error: false });
    }
    if (wantQR) {
      items.push({
        id: QUESTIONNAIRE_RESPONSES_DATA_KEY,
        title: QUESTIONNAIRE_RESPONSES_DATA_KEY,
        complete: false,
        error: false,
      });
    }

    // Phase-2 configured extras (exclude Q/QR and blocked)
    const extrasPlanned = configuredTypesRaw
      .filter((t) => {
        const n = normalizeType(t);
        return (
          !BLOCKED_EXTRA_TYPES.has(n) &&
          n !== normalizeType(QUESTIONNAIRE_DATA_KEY) &&
          n !== normalizeType(QUESTIONNAIRE_RESPONSES_DATA_KEY)
        );
      })
      // de-dupe while preserving case
      .filter((t, i, arr) => arr.findIndex((x) => normalizeType(x) === normalizeType(t)) === i);

    for (const t of extrasPlanned) {
      items.push({ id: t, title: t, complete: false, error: false });
    }

    // Always track summary
    items.push({ id: SUMMARY_DATA_KEY, title: "Response Summary Data", complete: false, error: false, data: null });

    dispatchLoader({ type: "INIT_TRACKING", items });
  }, [phase1Key, configuredTypesRaw, configuredTypeSet, dispatchLoader]);

  const phase1Query = useQuery(
    ["phase1-qr-obs-q", phase1Key],
    async () => {
      if (!client || !isNonEmptyString(pid)) {
        const msg = "No FHIR client or patient ID provided.";
        setError(msg);
        throw new Error(msg);
      }

      return runPhase1Once(phase1Key, async () => {
        const preloadList = getEnvQuestionnaireList();
        let qrResources = [];
        let obResources = [];

        // What we intend to fetch in phase-1
        const wantQ = shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY);
        const wantQR = shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);
        const wantObs = wantQ || wantQR;

        // Track request errors locally
        let qrReqErrored = false;
        let qReqErrored = false;

        // Conditionally fetch QR + Obs
        if (wantQR) {
          try {
            await client.request(
              { url: `QuestionnaireResponse?_count=200&patient=${pid}`, header: NO_CACHE_HEADER },
              { pageLimit: 0, onPage: processPage(client, qrResources) },
            );
          } catch (e) {
            qrReqErrored = true;
            dispatchLoader({
              type: "ERROR",
              id: QUESTIONNAIRE_RESPONSES_DATA_KEY,
              errorMessage: e?.message || "QuestionnaireResponse request failed",
            });
          }
        }

        if (wantObs) {
          const flowsheetIds = toStringArray(getFlowsheetIds());
          const obsQueryBase = `Observation?_count=200&patient=${pid}`;
          const obsUrl = flowsheetIds.length ? `${obsQueryBase}&code=${flowsheetIds.join(",")}` : obsQueryBase;

          try {
            await client.request(
              { url: obsUrl, header: NO_CACHE_HEADER },
              { pageLimit: 0, onPage: processPage(client, obResources) },
            );
          } catch (e) {
            // We don't track Observation in the loader, but log for diagnostics.
            console.warn("Observation request failed", e);
          }
        }

        let matchedQRs = !isEmptyArray(qrResources)
          ? qrResources.filter((it) => it && it.questionnaire && it.questionnaire.split("/")[1])
          : [];

        const hasPreload = !isEmptyArray(preloadList);

        // If we have nothing to drive Questionnaire fetch (no preload, no QRs, no Obs)
        if (!hasPreload && !isFromEpic && isEmptyArray(matchedQRs) && isEmptyArray(obResources)) {
          if (wantQ) {
            dispatchLoader({
              type: "ERROR",
              id: QUESTIONNAIRE_DATA_KEY,
              errorMessage: "No questionnaires to load (no preload, QR matches, or observations)",
            });
          }
          if (!qrReqErrored && wantQR) {
            dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_RESPONSES_DATA_KEY });
          }
          // With no inputs, summary has nothing to compute
          dispatchLoader({ type: "COMPLETE", id: SUMMARY_DATA_KEY, data: {} });
          return {};
        }

        // Build synthetic Q/QR from observations where configs match
        let qIds = [...preloadList];
        let syntheticQs = [];
        if (wantObs && !isEmptyArray(obResources)) {
          const obsLinkIds = getLinkIdsFromObservations(obResources);
          if (!isEmptyArray(obsLinkIds)) {
            for (const [key, cfg] of Object.entries(questionnaireConfigs || {})) {
              if (!cfg) continue;
              if (hasPreload && !preloadList.find((q) => fuzzyMatch(q, key))) continue;

              const cfgLinkIds = toStringArray(cfg.questionLinkIds);
              const hit = cfgLinkIds.find((linkId) => obsLinkIds.includes(normalizeLinkId(linkId)));
              if (!hit) continue;

              const builtQ = buildQuestionnaire(cfg);
              const builtQRs = observationsToQuestionnaireResponses(obResources, cfg);
              syntheticQs.push(builtQ);
              matchedQRs = [...matchedQRs, ...builtQRs];
              if (cfg.questionnaireId) qIds.push(cfg.questionnaireId);
            }
          }
        }

        // Determine Questionnaire list & fetch
        const matchedQIds = matchedQRs?.map((it) => it.questionnaire?.split("/")[1]) ?? [];
        const uniqueQIds = [...new Set([...qIds, ...matchedQIds])];
        const qListToLoad = hasPreload ? preloadList : uniqueQIds;

        const qPath = getFHIRResourcePath(pid, [QUESTIONNAIRE_DATA_KEY], {
          questionnaireList: qListToLoad,
          exactMatchById: !hasPreload || isFromEpic,
        });

        let qResources = [];
        if (wantQ) {
          try {
            await client.request(
              { url: qPath, header: NO_CACHE_HEADER },
              { pageLimit: 0, onPage: processPage(client, qResources) },
            );
          } catch (e) {
            qReqErrored = true;
            dispatchLoader({ type: "ERROR", id: QUESTIONNAIRE_DATA_KEY, errorMessage: e?.message });
          }
        }

        const questionnaires = [
          ...getFhirResourcesFromQueryResult(syntheticQs),
          ...getFhirResourcesFromQueryResult(qResources),
        ];
        const questionnaireResponses = getFhirResourcesFromQueryResult(matchedQRs);

        return {
          questionnaires,
          questionnaireResponses,
          qListToLoad,
          exactMatchById: !hasPreload || isFromEpic,
          qrReqErrored,
          qReqErrored,
        };
      });
    },
    {
      ...DEFAULT_QUERY_PARAMS,
      enabled: !!client && !!pid && !base.complete && !base.error && !!phase1Key,
      onSuccess: (payload) => {
        if (phase1KeyRef.current !== phase1Key) return; // ignore stale result
        const { questionnaires, questionnaireResponses, qListToLoad, exactMatchById, qrReqErrored, qReqErrored } =
          payload || {};

        // seed bundle
        patientBundle.current = {
          ...patientBundle.current,
          entry: [{ resource: patient }, ...(questionnaireResponses ?? []), ...(questionnaires ?? [])],
        };

        // commit base results
        dispatchBase({
          type: "RESULTS",
          questionnaireList: qListToLoad,
          questionnaires,
          questionnaireResponses,
          exactMatchById,
        });

        // Mark base rows complete only if tracked
        const wantQ = shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY);
        const wantQR = shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);
        if (!qReqErrored && wantQ) dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_DATA_KEY });
        if (!qrReqErrored && wantQR) dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_RESPONSES_DATA_KEY });

        // compute extra resource types for phase-2
        const haveTypes = [
          ...new Set(getResourceTypesFromResources(questionnaires ?? []).map((r) => String(r).toLowerCase())),
          ...new Set(getResourceTypesFromResources(questionnaireResponses ?? []).map((r) => String(r).toLowerCase())),
          "patient",
        ];

        // What config wants overall (already seeded in loader), excluding Q/QR/blocked
        const extrasPlanned = configuredTypesRaw.filter((t) => {
          const n = normalizeType(t);
          return (
            !BLOCKED_EXTRA_TYPES.has(n) &&
            n !== normalizeType(QUESTIONNAIRE_DATA_KEY) &&
            n !== normalizeType(QUESTIONNAIRE_RESPONSES_DATA_KEY)
          );
        });

        // Which extras are actually needed after phase-1 results
        const extrasWanted = extrasPlanned.filter((t) => !haveTypes.includes(normalizeType(t)));

        // Keep needed extras pending (ensure rows exist)
        if (!isEmptyArray(extrasWanted)) {
          dispatchLoader({
            type: "UPSERT_MANY",
            items: extrasWanted.map((t) => ({ id: t, title: t, complete: false, error: false })),
          });
        }

        // Mark *not* needed extras as complete (skipped)
        const extrasSkip = extrasPlanned.filter(
          (t) => !extrasWanted.find((w) => normalizeType(w) === normalizeType(t)),
        );
        for (const t of extrasSkip) {
          dispatchLoader({ type: "COMPLETE", id: t, data: [] }); // no fetch needed
        }

        // Drive phase-2 list
        setExtraTypes(extrasWanted);

        // If nothing to fetch, summary can finalize now
        if (isEmptyArray(extrasWanted)) {
          dispatchLoader({
            type: "COMPLETE",
            id: SUMMARY_DATA_KEY,
            data: getSummaries(patientBundle.current.entry),
          });
        }
      },
      onError: (e) => {
        if (phase1KeyRef.current !== phase1Key) return; // ignore stale error
        dispatchBase({ type: "ERROR", errorMessage: e?.message ?? String(e) });
      },
    },
  );

  /** -------------------- Phase 2 via React Query -------------------- */
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
    for (const res of settled) {
      if (res.status === "fulfilled") {
        bundle = [...bundle, ...getFhirResourcesFromQueryResult(res.value)];
      }
    }
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

      dispatchLoader({ type: "COMPLETE", id: SUMMARY_DATA_KEY, data: getSummaries(patientBundle.current.entry) });
      return fhirData;
    },
    {
      ...DEFAULT_QUERY_PARAMS,
      enabled: readyForExtras,
    },
  );

  /** -------------------- Derived helpers -------------------- */
  const phase2DoneOrSkipped =
    isEmptyArray(toBeLoadedResources) || !toBeLoadedResources.find((o) => !o.complete) || !!error;

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
    const dataToUse = JSON.parse(JSON.stringify(summaryData.data));
    const keys = Object.keys(dataToUse);

    const rows = keys.flatMap((key) => {
      const d = dataToUse[key];
      if (!d || isEmptyArray(d.chartData?.data)) return [];
      return d.chartData.data.map((o) => ({ ...o, key, [key]: o.score }));
    });

    return rows.sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));
  }, [summaryData]);

  const loading =
    (phase1Query.isLoading && !base.complete) ||
    (!base.complete && !base.error) ||
    (base.complete && extraTypes.length > 0 && !phase2DoneOrSkipped && !base.error);

  if (isReady) {
    console.log("summaryData ", summaryData);
  }

  return {
    // status
    loading,
    isReady,
    error: error || (base.error ? base.errorMessage : null),

    // to be loaded resources tracking
    toBeLoadedResources,

    // base (phase 1)
    questionnaireList: base.questionnaireList,
    questionnaires: base.questionnaires,
    questionnaireResponses: base.questionnaireResponses,
    summaries: base.summaries,

    // phase 2
    evalData: patientBundle.current.evalResults,

    // bundle
    patientBundle: patientBundle.current.entry,

    // charts
    summaryData,
    allChartData,

    // controls
    refresh,
  };
}

// Export reducer for unit tests if desired
export { reducer };
