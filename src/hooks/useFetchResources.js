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
const PHASE1_FLIGHTS = new Map(); // key -> Promise<{...}>

/** Runs phase-1 exactly once per key by returning the same Promise if already in-flight or completed. */
function runPhase1Once(key, fn) {
  if (PHASE1_FLIGHTS.has(key)) return PHASE1_FLIGHTS.get(key);
  const p = (async () => {
    try {
      return await fn();
    } finally {
      // Keep cached to share settled result. Uncomment to allow re-runs after settle:
      // PHASE1_FLIGHTS.delete(key);
    }
  })();
  PHASE1_FLIGHTS.set(key, p);
  return p;
}

/** ---- Base reducer (QRs/Qs/summaries) ---- */
function baseReducer(state, action) {
  switch (String(action.type).toUpperCase()) {
    case "RESULTS":
      return {
        ...state,
        ...action,
        exactMatchById: !!action.exactMatchById,
        complete: true,
        error: false,
        errorMessage: "",
      };
    case "ERROR":
      return {
        ...state,
        error: true,
        errorMessage: action.errorMessage ?? String(action.message ?? "Unknown error"),
        complete: true,
      };
    case "RESET":
      return {
        ...state,
        questionnaireList: [],
        questionnaires: [],
        questionnaireResponses: [],
        summaries: {},
        complete: false,
        error: false,
        errorMessage: "",
      };
    default:
      return state;
  }
}

/** ---- Loader reducer for to-be-loaded FHIR resources ---- */
function loaderReducer(state, action) {
  switch (String(action.type).toUpperCase()) {
    case "INIT_TRACKING":
      return action.items;

    case "UPSERT_MANY": {
      const map = new Map(state.map((r) => [r.id, r]));
      for (const it of action.items) {
        map.set(it.id, { ...(map.get(it.id) || {}), ...it });
      }
      return Array.from(map.values());
    }

    case "COMPLETE":
      return state.map((r) => (r.id === action.id ? { ...r, data: action.data ?? r.data, complete: true } : r));

    case "ERROR":
      return state.map((r) =>
        r.id === action.id
          ? { ...r, complete: true, error: true, errorMessage: action.errorMessage || String(action.reason || "") }
          : r,
      );

    case "RESET":
      return [];

    default:
      return state;
  }
}

function getSummaries(bundle) {
  return new QuestionnaireScoringBuilder({}, bundle).summariesByQuestionnaireFromBundle();
}

export default function useFetchResources() {
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
  const { client, patient } = useContext(FhirClientContext);

  const [base, dispatchBase] = useReducer(baseReducer, {
    questionnaireList: [],
    questionnaires: [],
    questionnaireResponses: [],
    exactMatchById: isFromEpic,
    summaries: {},
    complete: false,
    error: false,
    errorMessage: "",
  });

  // resources loading tracking
  const [toBeLoadedResources, dispatchLoader] = useReducer(loaderReducer, []);
  const [extraTypes, setExtraTypes] = useState([]);
  const [error, setError] = useState(null);

  // refresh
  const [bump, setBump] = useState(0);
  const refresh = useCallback(() => {
    dispatchBase({ type: "RESET" });
    dispatchLoader({ type: "RESET" });
    setError(null);
    setExtraTypes([]);
    if (patient?.id) PHASE1_FLIGHTS.delete(`${patient.id}::${bump}`);
    setBump((x) => x + 1);
  }, [patient?.id, bump]);

  // Bundle + eval results
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [],
    evalResults: {},
  });

  /** -------------------- Phase 1 via React Query (single-flight guarded) -------------------- */
  const phase1Key = useMemo(() => (patient?.id ? `${patient.id}::${bump}` : null), [patient?.id, bump]);
  const phase1KeyRef = useRef(phase1Key);
  useEffect(() => {
    phase1KeyRef.current = phase1Key;
  }, [phase1Key]);

  useEffect(() => {
    if (!phase1Key) return;
    // Start with phase-1 types shown as pending
    dispatchLoader({
      type: "INIT_TRACKING",
      items: [
        { id: QUESTIONNAIRE_DATA_KEY, title: QUESTIONNAIRE_DATA_KEY, complete: false, error: false },
        { id: QUESTIONNAIRE_RESPONSES_DATA_KEY, title: QUESTIONNAIRE_RESPONSES_DATA_KEY, complete: false, error: false },
        { id: SUMMARY_DATA_KEY, title: "Response Summary Data", complete: false, error: false, data: null },
      ],
    });
  }, [phase1Key]);

  const phase1Query = useQuery(
    ["phase1-qr-obs-q", phase1Key],
    async () => {
      if (!client || !patient?.id) {
        const msg = "No FHIR client or patient ID provided.";
        setError(msg);
        throw new Error(msg);
      }

      return runPhase1Once(phase1Key, async () => {
        const preloadList = getEnvQuestionnaireList();
        let qrResources = [];
        let obResources = [];

        // Track request errors locally
        let qrReqErrored = false;
        let qReqErrored = false;

        const results = await Promise.allSettled([
          client.request(
            { url: `QuestionnaireResponse?_count=200&patient=${patient.id}`, header: NO_CACHE_HEADER },
            { pageLimit: 0, onPage: processPage(client, qrResources) },
          ),
          client.request(
            {
              url: `Observation?_count=200&patient=${patient.id}&code=${getFlowsheetIds().join(",")}`,
              header: NO_CACHE_HEADER,
            },
            { pageLimit: 0, onPage: processPage(client, obResources) },
          ),
        ]);

        const [qrRes, obsRes] = results;
        if (qrRes.status === "rejected") {
          qrReqErrored = true;
          dispatchLoader({
            type: "ERROR",
            id: QUESTIONNAIRE_RESPONSES_DATA_KEY,
            errorMessage: qrRes.reason?.message || "QuestionnaireResponse request failed",
          });
        }
        if (obsRes.status === "rejected") {
          // We don't track Observation row; still useful to log
          console.warn("Observation request failed", obsRes.reason);
        }

        let matchedQRs = !isEmptyArray(qrResources)
          ? qrResources.filter((it) => it && it.questionnaire && it.questionnaire.split("/")[1])
          : [];

        const hasPreload = !isEmptyArray(preloadList);

        // If we have nothing to drive Questionnaire fetch (no preload, no QRs, no Obs),
        // mark Questionnaire as error, QR as complete (unless its request errored), and finish summary.
        if (!hasPreload && !isFromEpic && isEmptyArray(matchedQRs) && isEmptyArray(obResources)) {
          dispatchLoader({
            type: "ERROR",
            id: QUESTIONNAIRE_DATA_KEY,
            errorMessage: "No questionnaires to load (no preload, QR matches, or observations)",
          });
          if (!qrReqErrored) {
            dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_RESPONSES_DATA_KEY });
          }
          dispatchLoader({ type: "COMPLETE", id: SUMMARY_DATA_KEY, data: {} });
          return {};
        }

        // Build synthetic Q/QR from observations where configs match
        let qIds = [...preloadList];
        let syntheticQs = [];
        if (!isEmptyArray(obResources)) {
          const obsLinkIds = getLinkIdsFromObservations(obResources);
          if (!isEmptyArray(obsLinkIds)) {
            for (const key in questionnaireConfigs) {
              const cfg = questionnaireConfigs[key];
              if (hasPreload && !preloadList.find((q) => fuzzyMatch(q, key))) continue;
              const hit = cfg?.questionLinkIds?.find((linkId) => obsLinkIds.includes(normalizeLinkId(linkId)));
              if (hit && cfg) {
                const builtQ = buildQuestionnaire(cfg);
                const builtQRs = observationsToQuestionnaireResponses(obResources, cfg);
                syntheticQs = [...syntheticQs, builtQ];
                matchedQRs = [...matchedQRs, ...builtQRs];
                if (cfg.questionnaireId) qIds.push(cfg.questionnaireId);
              }
            }
          }
        }

        // Determine Questionnaire list & fetch
        const matchedQIds = matchedQRs?.map((it) => it.questionnaire?.split("/")[1]) ?? [];
        const uniqueQIds = [...new Set([...qIds, ...matchedQIds])];
        const qListToLoad = hasPreload ? preloadList : uniqueQIds;

        const qPath = getFHIRResourcePath(patient.id, ["Questionnaire"], {
          questionnaireList: qListToLoad,
          exactMatchById: !hasPreload || isFromEpic,
        });

        let qResources = [];
        try {
          await client.request(
            { url: qPath, header: NO_CACHE_HEADER },
            { pageLimit: 0, onPage: processPage(client, qResources) },
          );
        } catch (e) {
          qReqErrored = true;
          console.error("Error requesting Questionnaire resources ", e);
          dispatchLoader({ type: "ERROR", id: QUESTIONNAIRE_DATA_KEY, errorMessage: e?.message });
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
      enabled: !!client && !!patient?.id && !base.complete && !base.error && !!phase1Key,
      onSuccess: (payload) => {
        if (phase1KeyRef.current !== phase1Key) return; // ignore stale result
        const {
          questionnaires,
          questionnaireResponses,
          qListToLoad,
          exactMatchById,
          qrReqErrored,
          qReqErrored,
        } = payload || {};

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

        // Mark phase-1 rows complete iff their request didn't error
        if (!qReqErrored) dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_DATA_KEY });
        if (!qrReqErrored) dispatchLoader({ type: "COMPLETE", id: QUESTIONNAIRE_RESPONSES_DATA_KEY });

        // compute extra resource types for phase-2
        const haveTypes = [
          ...new Set(getResourceTypesFromResources(questionnaires ?? []).map((r) => String(r).toLowerCase())),
          ...new Set(getResourceTypesFromResources(questionnaireResponses ?? []).map((r) => String(r).toLowerCase())),
          "patient",
        ];

        const wanted = getFHIRResourceTypesToLoad()
          .flat()
          .filter((t) => !haveTypes.includes(String(t).toLowerCase()));

        const uniqWanted = [...new Set(wanted)].filter(
          (t) => !BLOCKED_EXTRA_TYPES.has(String(t).replace(/\s+/g, "").toLowerCase()),
        );

        setExtraTypes(uniqWanted);

        if (uniqWanted.length > 0) {
          dispatchLoader({
            type: "UPSERT_MANY",
            items: uniqWanted.map((t) => ({
              id: t,
              title: t,
              complete: false,
              error: false,
            })),
          });
        } else {
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
    !!client && !!patient?.id && base.complete && !base.error && extraTypes.length > 0 && toBeLoadedResources.length > 0;

  const loadedFHIRDataRef = useRef([]);

  const getFhirResources = useCallback(async () => {
    loadedFHIRDataRef.current = [];
    const paths = getFHIRResourcePaths(patient.id, extraTypes, {
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
  }, [client, patient?.id, extraTypes, base.questionnaireList, base.exactMatchById, dispatchLoader]);

  useQuery(
    ["extra-fhir-resources", patient?.id, extraTypes.join(","), bump],
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

  const isReady = base.complete && (phase2DoneOrSkipped || extraTypes.length === 0) && !base.error;

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
    if (!summaryData) return null; // summaryData already encodes usefulness
    const dataToUse = JSON.parse(JSON.stringify(summaryData.data));
    const keys = Object.keys(dataToUse);

    const rows = keys.flatMap((key) => {
      const d = dataToUse[key];
      if (!d || isEmptyArray(d.chartData?.data)) return [];
      return d.chartData.data.map((o) => ({ ...o, key, [key]: o.score }));
    });

    return rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
