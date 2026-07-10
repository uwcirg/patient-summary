import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  fuzzyMatch,
  getEnvQuestionnaireList,
  getDisplayQTitle,
  getEnv,
  getEnvHelpEmail,
  isDemoDataEnabled,
  isEmptyArray,
} from "@util";
import questionnaireConfigs from "@config/questionnaire_config";
import {
  buildQuestionnaire,
  buildReportData,
  observationsToQuestionnaireResponses,
} from "@models/resultBuilders/helpers";
import QuestionnaireScoringBuilder from "@models/resultBuilders/QuestionnaireScoringBuilder";
import demoData from "@/data/demoData";
import { FhirClientContext } from "@/context/FhirClientContext";
import { NO_CACHE_HEADER, SOFT_ERROR_KEY } from "@/consts";

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
const PHASE1_FLIGHTS = new WeakMap();
function runPhase1Once(client, key, fn) {
  if (!PHASE1_FLIGHTS.has(client)) PHASE1_FLIGHTS.set(client, new Map());
  const flights = PHASE1_FLIGHTS.get(client);

  if (flights.has(key)) return flights.get(key);
  const p = (async () => {
    try {
      return await fn();
    } finally {
      setTimeout(() => flights.delete(key), 5000);
    }
  })();
  flights.set(key, p);
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

const extractSoftErrors = (resources) => {
  if (isEmptyArray(resources)) return [];
  return resources.filter((r) => r && typeof r[SOFT_ERROR_KEY] === "string").map((r) => r[SOFT_ERROR_KEY]);
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
              summaries: action.data || {},
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

      // Completes multiple loader items in a single dispatch to avoid
      // intermediate renders between sequential COMPLETE calls.
      // If SUMMARY_DATA_KEY is in the batch, mirrors summaryData into base.summaries.
      case "COMPLETE_MANY": {
        const ids = new Set(action.ids ?? []);
        const updatedLoader = state.loader.map((r) =>
          ids.has(r.id)
            ? {
                ...r,
                data: r.id === SUMMARY_DATA_KEY ? (action.summaryData ?? r.data) : (action.data ?? r.data),
                complete: true,
                error: false,
              }
            : r,
        );
        if (ids.has(SUMMARY_DATA_KEY) && action.summaryData !== undefined) {
          return {
            ...state,
            base: { ...state.base, summaries: action.summaryData || {} },
            loader: updatedLoader,
          };
        }
        return { ...state, loader: updatedLoader };
      }

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

  // Combines base RESULTS + loader COMPLETE_MANY into a single state update,
  // avoiding the two sequential dispatches that caused intermediate renders.
  if (actionType === "RESULTS_AND_COMPLETE") {
    const ids = new Set(action.completeIds ?? []);
    const updatedLoader = state.loader.map((r) =>
      ids.has(r.id)
        ? {
            ...r,
            data: r.id === SUMMARY_DATA_KEY ? (action.summaryData ?? r.data) : (action.data ?? r.data),
            complete: true,
            error: false,
          }
        : r,
    );
    const newBase = {
      ...state.base,
      questionnaireList: action.questionnaireList ?? state.base.questionnaireList,
      questionnaires: action.questionnaires ?? [],
      questionnaireResponses: action.questionnaireResponses ?? [],
      exactMatchById: !!action.exactMatchById,
      summaries: ids.has(SUMMARY_DATA_KEY) ? action.summaryData || {} : state.base.summaries,
      complete: true,
      error: false,
      errorMessage: "",
    };
    return { ...state, base: newBase, loader: updatedLoader };
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

const INITIAL_BASE_STATE = {
  questionnaireList: [],
  questionnaires: [],
  questionnaireResponses: [],
  exactMatchById: String(getEnv("REACT_APP_EPIC_QUERIES")) === "true",
  summaries: {},
  complete: false,
  error: false,
  errorMessage: "",
};

function createInitialState(configuredTypeSet, plannedExtras, isFromEpic) {
  const items = [];
  const wantQ = shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY);
  const wantQR = shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);

  if (wantQ) items.push({ id: QUESTIONNAIRE_DATA_KEY, title: QUESTIONNAIRE_DATA_KEY, complete: false, error: false });
  if (wantQR) {
    items.push({ id: QUESTIONNAIRE_RESPONSES_DATA_KEY, title: QUESTIONNAIRE_RESPONSES_DATA_KEY, complete: false });
    items.push({ id: OBSERVATION_DATA_KEY, title: OBSERVATION_DATA_KEY, complete: false });
  }
  for (const t of plannedExtras) items.push({ id: t, title: t, complete: false, error: false });
  items.push({ id: SUMMARY_DATA_KEY, title: "Response Summary Data", complete: false, data: null });

  return {
    base: { ...INITIAL_BASE_STATE, exactMatchById: isFromEpic },
    loader: items,
  };
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------
export default function useFetchResources() {
  const ERROR_HELP_TEXT = useMemo(
    () =>
      `This patient does not yet have data reported from the CNICS PRO system. If the patient has indeed completed a CNICS PRO assessment, please write to <a href="mailto:${getEnvHelpEmail()}">${getEnvHelpEmail()}</a> for help.`,
    [],
  );
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
  // recompute configured types when mounted (config is static at runtime)
  const configuredTypesRaw = useMemo(() => getFHIRResourceTypesToLoad().flat().map(String).filter(Boolean), []);
  const configuredTypeSet = useMemo(() => new Set(configuredTypesRaw.map(normalizeType)), [configuredTypesRaw]);
  const plannedExtras = useMemo(() => computePlannedExtras(configuredTypesRaw), [configuredTypesRaw]);
  const { client, patient } = useContext(FhirClientContext);

  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createInitialState(configuredTypeSet, plannedExtras, isFromEpic),
  );
  // stable scoped dispatchers
  const dispatchBase = useCallback((action) => dispatch({ ...action, scope: "base" }), [dispatch]);
  const dispatchLoader = useCallback((action) => dispatch({ ...action, scope: "loader" }), [dispatch]);

  const base = state.base;
  const toBeLoadedResources = state.loader;

  const [bundleEntries, setBundleEntries] = useState([]);
  const [extraTypes, setExtraTypes] = useState([]);
  const [fatalError, setFatalError] = useState(null);
  // stable patient id
  const pid = useMemo(() => (isNonEmptyString(patient?.id) ? String(patient.id) : null), [patient?.id]);
  // refresh bump controls recomputation of configured types
  const [bump, setBump] = useState(0);

  const refresh = useCallback(() => {
    dispatchBase({ type: "RESET" });
    dispatchLoader({ type: "RESET" });
    setFatalError(null);
    setExtraTypes([]);
    if (pid && client) {
      PHASE1_FLIGHTS.get(client)?.delete(`${pid}::${bump}`);
    }
    setBump((x) => x + 1);
  }, [pid, bump, client, dispatchBase, dispatchLoader]);

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

  useEffect(() => {
    return () => {
      if (phase1Key) {
        PHASE1_FLIGHTS.delete(phase1Key);
      }
    };
  }, [phase1Key]);

  // Stable refs for callbacks used inside queryFn to avoid stale closures
  const dispatchLoaderRef = useRef(dispatchLoader);
  const dispatchBaseRef = useRef(dispatchBase);
  const ERROR_HELP_TEXT_REF = useRef(ERROR_HELP_TEXT);
  useEffect(() => {
    dispatchLoaderRef.current = dispatchLoader;
  }, [dispatchLoader]);
  useEffect(() => {
    dispatchBaseRef.current = dispatchBase;
  }, [dispatchBase]);
  useEffect(() => {
    ERROR_HELP_TEXT_REF.current = ERROR_HELP_TEXT;
  }, [ERROR_HELP_TEXT]);

  const phase1Query = useQuery({
    queryKey: [["phase1-qr-obs-q"], phase1Key],
    queryFn: async () => {
      if (!client || !isNonEmptyString(pid)) {
        const msg = "No FHIR client or patient ID provided.";
        setFatalError(msg);
        throw new Error(msg);
      }

      return runPhase1Once(client, phase1Key, async () => {
        const preloadList = getEnvQuestionnaireList();
        const hasPreload = !isEmptyArray(preloadList);

        let qrResources = [];
        let obResources = [];
        let qResources = [];

        const wantQ =
          hasPreload ||
          shouldTrack(configuredTypeSet, QUESTIONNAIRE_DATA_KEY) ||
          shouldTrack(configuredTypeSet, QUESTIONNAIRE_RESPONSES_DATA_KEY);

        const phase1ExactMatchById = !hasPreload || isFromEpic;

        // --- Build phase-1 tasks (QR + Obs in parallel) ---
        const phase1Tasks = [];

        if (wantQ) {
          phase1Tasks.push({
            id: QUESTIONNAIRE_RESPONSES_DATA_KEY,
            promise: client.request(
              { url: `QuestionnaireResponse?patient=${pid}`, header: NO_CACHE_HEADER },
              { pageLimit: 0, onPage: processPage(client, qrResources) },
            ),
            onErrorMessage: "QuestionnaireResponse request failed",
          });

          const obURLs = getFlowSheetObservationURLS(pid);
          obURLs.forEach((url) => {
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

        if (phase1Tasks.length) {
          const results = await Promise.allSettled(phase1Tasks.map((t) => t.promise));
          results.forEach((res, i) => {
            const { id, onErrorMessage } = phase1Tasks[i];
            if (res.status === "fulfilled") {
              dispatchLoaderRef.current({ type: "COMPLETE", id });
            } else {
              console.log("Request error for", id, res.reason);
              dispatchLoaderRef.current({
                type: "ERROR",
                id,
                errorMessage: res.reason?.message || onErrorMessage || `${id} request failed`,
              });
            }
          });

          const softErrorSources = [
            { id: QUESTIONNAIRE_RESPONSES_DATA_KEY, resources: qrResources },
            { id: OBSERVATION_DATA_KEY, resources: obResources },
          ];
          for (const { id, resources } of softErrorSources) {
            const softErrs = extractSoftErrors(resources);
            if (softErrs.length) {
              console.log("Soft errors found in resources for", id, softErrs);
              dispatchLoaderRef.current({ type: "ERROR", id, errorMessage: ERROR_HELP_TEXT_REF.current });
            }
          }
        }
        // Filter matched QRs by Questionnaire/id presence
        let matchedQRs = !isEmptyArray(qrResources)
          ? qrResources.filter((it) => it && it.questionnaire && it.questionnaire.split("/")[1])
          : [];
        // Derive qListToLoad from QR-matched ids + preloadList.
        const matchedQIds = matchedQRs?.map((it) => it.questionnaire?.split("/")[1]) ?? [];
        const uniqueQIds = [...new Set([...preloadList, ...matchedQIds])];
        const qListToLoad = hasPreload ? preloadList : uniqueQIds;
        console.log("qListToLoad ", qListToLoad);

        if (wantQ) {
          if (isEmptyArray(qListToLoad)) {
            dispatchLoaderRef.current({ type: "COMPLETE", id: QUESTIONNAIRE_DATA_KEY });
          } else {
            let qPaths = [];

            if (phase1ExactMatchById) {
              qPaths = qListToLoad.map((qid) =>
                getFHIRResourcePath(pid, QUESTIONNAIRE_DATA_KEY, {
                  questionnaireList: [qid],
                  exactMatchById: phase1ExactMatchById,
                }),
              );
            } else {
              qPaths = [
                getFHIRResourcePath(pid, QUESTIONNAIRE_DATA_KEY, {
                  questionnaireList: qListToLoad,
                  exactMatchById: phase1ExactMatchById,
                }),
              ];
            }

            const qPromises = qPaths.map((qPath) =>
              client.request(
                { url: qPath, header: NO_CACHE_HEADER },
                { pageLimit: 0, onPage: processPage(client, qResources) },
              ),
            );

            const qResults = await Promise.allSettled(qPromises);

            const anySuccess = qResults.some((r) => r.status === "fulfilled");
            if (anySuccess) {
              const softErrs = extractSoftErrors(qResources);
              if (softErrs.length) {
                console.log("Soft errors found in Questionnaire resources ", softErrs);
                dispatchLoaderRef.current({
                  type: "ERROR",
                  id: QUESTIONNAIRE_DATA_KEY,
                  errorMessage: ERROR_HELP_TEXT_REF.current,
                });
              } else {
                dispatchLoaderRef.current({ type: "COMPLETE", id: QUESTIONNAIRE_DATA_KEY });
              }
            } else {
              const firstErr = qResults.find((r) => r.status === "rejected");
              console.log("Questionnaire request errors ", firstErr?.reason?.message || firstErr);
              dispatchLoaderRef.current({
                type: "ERROR",
                id: QUESTIONNAIRE_DATA_KEY,
                errorMessage: firstErr?.reason?.message || "Questionnaire request failed",
              });
            }
          }
        }

        // Obs-matching runs here — after Q fetch — so qResources is fully populated.
        const syntheticQs = [],
          syntheticQRs = [];

        if (wantQ && !isEmptyArray(obResources)) {
          const obsCodes = getCodeableCodesFromObservation(obResources);
          if (!isEmptyArray(obsCodes)) {
            for (const [key, cfg] of Object.entries(questionnaireConfigs || {})) {
              if (!cfg) continue;
              if (hasPreload && !preloadList.find((q) => fuzzyMatch(q, key))) continue;

              const matchedQResource = cfg.questionnaireId
                ? qResources.find((r) => (r?.resource?.id ?? r?.id) === cfg.questionnaireId)
                : null;
              const qItemCodes = matchedQResource
                ? (matchedQResource.resource?.item ?? matchedQResource.item ?? [])
                    .filter((item) => item.type !== "group" && item.type !== "display")
                    .flatMap((item) => item.code ?? [])
                    .map((c) => c.code)
                    .filter(Boolean)
                : [];
              const hit =
                qItemCodes.length > 0
                  ? qItemCodes.find((code) => obsCodes.includes(code))
                  : toStringArray([...(cfg.questionLinkIds ?? [])]).find((linkId) =>
                      obsCodes.includes(normalizeLinkId(linkId)),
                    );

              if (!hit) continue;

              const builtQ = buildQuestionnaire(obResources, cfg);
              const builtQRs = observationsToQuestionnaireResponses(obResources, cfg) || [];
              console.log("matching cfg ", cfg);
              console.log("builtQ ", builtQ);
              console.log("builtQRs ", builtQRs);
              syntheticQs.push(builtQ);
              syntheticQRs.push(...builtQRs);
            }
          }
        }

        matchedQRs = [...matchedQRs, ...syntheticQRs];

        let questionnaires = [
          ...getFhirResourcesFromQueryResult(syntheticQs),
          ...getFhirResourcesFromQueryResult(qResources),
        ];
        questionnaires = Array.from(new Map(questionnaires.map((item) => [item.resource.id, item])).values());
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
          exactMatchById: phase1ExactMatchById,
        };
      });
    },
    ...DEFAULT_QUERY_PARAMS,
    enabled: !!client && !!pid && !base.complete && !base.error && !!phase1Key,
  });

  // Handle phase 1 success — collapsed into a single dispatch to avoid
  // intermediate renders from sequential dispatchBase + dispatchLoader calls.
  useEffect(() => {
    if (!phase1Query.isSuccess || !phase1Query.data) return;
    if (phase1KeyRef.current !== phase1Key) return;

    const { questionnaires, questionnaireResponses, qListToLoad, exactMatchById } = phase1Query.data;

    const haveTypes = [
      ...new Set(getResourceTypesFromResources(questionnaires ?? []).map((r) => String(r).toLowerCase())),
      ...new Set(getResourceTypesFromResources(questionnaireResponses ?? []).map((r) => String(r).toLowerCase())),
      "patient",
    ];

    const extrasWanted = plannedExtras.filter((t) => !haveTypes.includes(normalizeType(t)));
    const extrasSkip = plannedExtras.filter((t) => !extrasWanted.find((w) => normalizeType(w) === normalizeType(t)));

    if (isEmptyArray(extrasWanted)) {
      // No phase 2 needed — complete everything in one dispatch including summary
      const summaryData = getSummaries(patientBundle.current.entry);
      setBundleEntries([...patientBundle.current.entry]);
      dispatch({
        type: "RESULTS_AND_COMPLETE",
        // base fields
        questionnaireList: qListToLoad,
        questionnaires,
        questionnaireResponses,
        exactMatchById,
        // loader fields — complete all skipped extras + summary in one shot
        completeIds: [...extrasSkip, SUMMARY_DATA_KEY],
        summaryData,
        data: [],
      });
      return;
    }

    // Phase 2 needed — complete base + skipped extras in one dispatch,
    // then drive phase-2 list via state
    setBundleEntries([...patientBundle.current.entry]);
    dispatch({
      type: "RESULTS_AND_COMPLETE",
      // base fields
      questionnaireList: qListToLoad,
      questionnaires,
      questionnaireResponses,
      exactMatchById,
      // loader fields — only complete skipped extras (not summary yet)
      completeIds: extrasSkip,
      data: [],
    });

    // Upsert the extras that ARE needed into the loader
    if (!isEmptyArray(extrasWanted)) {
      dispatchLoader({
        type: "UPSERT_MANY",
        items: extrasWanted.map((t) => ({ id: t, title: t, complete: false, error: false })),
      });
    }

    setExtraTypes(extrasWanted);
  }, [phase1Query.isSuccess, phase1Query.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle phase 1 error
  useEffect(() => {
    if (!phase1Query.isError || !phase1Query.error) return;
    if (phase1KeyRef.current !== phase1Key) return;
    dispatchBase({ type: "ERROR", errorMessage: phase1Query.error?.message ?? String(phase1Query.error) });
  }, [phase1Query.isError, phase1Query.error]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const getFhirResources = useCallback(async () => {
    const loadedFHIRData = [];

    const paths = getFHIRResourcePaths(pid, extraTypes, {
      questionnaireList: base.questionnaireList,
      exactMatchById: base.exactMatchById,
    });

    const requests = paths.map((p) =>
      client
        .request(
          { url: p.resourcePath, header: NO_CACHE_HEADER },
          { pageLimit: 0, onPage: processPage(client, loadedFHIRData) },
        )
        .then(() => {
          const softErrs = extractSoftErrors(loadedFHIRData);
          console.log(`Loaded resources for ${p.resourceType} with ${softErrs.length} soft errors.`);
          if (softErrs.length) {
            dispatchLoader({ type: "ERROR", id: p.resourceType, errorMessage: ERROR_HELP_TEXT });
          } else {
            dispatchLoader({ type: "COMPLETE", id: p.resourceType });
          }
          return loadedFHIRData;
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
  }, [client, pid, extraTypes, base.questionnaireList, base.exactMatchById, dispatchLoader, ERROR_HELP_TEXT]);

  const phase2Query = useQuery({
    queryKey: [["extra-fhir-resources"], pid, extraTypes.join(","), bump],
    queryFn: async () => {
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
    ...DEFAULT_QUERY_PARAMS,
    enabled: readyForExtras,
  });

  // Handle phase 2 success — complete summary in one dispatch
  useEffect(() => {
    if (!phase2Query.isSuccess) return;
    dispatchLoader({
      type: "COMPLETE",
      id: SUMMARY_DATA_KEY,
      data: getSummaries(patientBundle.current.entry),
    });
  }, [phase2Query.isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle phase 2 error
  useEffect(() => {
    if (!phase2Query.isError || !phase2Query.error) return;
    dispatchBase({ type: "ERROR", errorMessage: phase2Query.error?.message ?? String(phase2Query.error) });
  }, [phase2Query.isError, phase2Query.error]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Derived helpers & return payload
  // ---------------------------------------------------------------------------

  // If no extras are needed, phase 2 is irrelevant — treat as done immediately.
  // This prevents toBeLoadedResources updates from oscillating isReady after
  // base.complete becomes true in the no-phase-2 path.
  const phase2DoneOrSkipped = useMemo(
    () =>
      isEmptyArray(extraTypes) ||
      isEmptyArray(toBeLoadedResources) ||
      !toBeLoadedResources.find((o) => !o.complete) ||
      !!fatalError,
    [toBeLoadedResources, fatalError, extraTypes],
  );

  // isReady is a one-way latch when extraTypes is empty:
  // once base.complete is true and no phase 2 is needed, isReady stays true
  // regardless of subsequent loader dispatches.
  const isReady = useMemo(() => {
    if (!base.complete || base.error) return false;
    if (isEmptyArray(extraTypes)) return true;
    return phase2DoneOrSkipped;
  }, [base.complete, base.error, phase2DoneOrSkipped, extraTypes]);

  const summaryDataItem = useMemo(
    () => toBeLoadedResources.find((r) => r.id === SUMMARY_DATA_KEY),
    [toBeLoadedResources],
  );

  const summaryData = useMemo(() => {
    if (!summaryDataItem || !summaryDataItem.data || summaryDataItem.error) return null;
    const keys = Object.keys(summaryDataItem.data);
    const hasAnyUseful = !!keys.find(
      (key) =>
        summaryDataItem.data[key] &&
        (summaryDataItem.data[key].error || !isEmptyArray(summaryDataItem.data[key].responseData)),
    );
    return hasAnyUseful ? summaryDataItem : null;
  }, [summaryDataItem]);

  const allChartData = useMemo(() => {
    if (!summaryData?.data) return null;
    const dataToUse = summaryData.data;
    const keys = Object.keys(dataToUse);
    const rows = keys.flatMap((key) => {
      const d = dataToUse[key];
      if (!d || isEmptyArray(d.chartData?.data)) return [];
      return d.chartData.data.map((o) => ({ ...o, key, [getDisplayQTitle(key)]: o.score }));
    });
    return rows.sort((a, b) => safeDateMs(a.date) - safeDateMs(b.date));
  }, [summaryData?.data]);

  const reportData = useMemo(() => {
    if (isDemoDataEnabled()) {
      return buildReportData({ summaryData: demoData });
    }
    return buildReportData({
      summaryData: summaryData?.data,
      bundle: bundleEntries,
    });
  }, [summaryData?.data, bundleEntries]);

  const allScoringSummaryData = useMemo(
    () =>
      Object.keys(summaryData?.data ?? {})
        .filter((key) => !!summaryData?.data[key]?.scoringSummaryData)
        .map((key) => ({
          key,
          ...summaryData?.data[key].scoringSummaryData,
        })),
    [summaryData?.data],
  );

  const chartKeys = useMemo(() => [...new Set(allChartData?.map((o) => getDisplayQTitle(o.key)))], [allChartData]);

  const loaderErrors = useMemo(() => state.loader.filter((r) => r?.error), [state.loader]);

  const errorMessages = useMemo(() => {
    const errors = [];
    if (base.error) errors.push(base.errorMessage);
    if (fatalError) errors.push(fatalError);
    for (const r of loaderErrors) {
      if (r.errorMessage && r.errorMessage.includes(" | ")) {
        const messages = r.errorMessage.split(" | ");
        for (const m of messages) {
          errors.push(`${r.title || r.id}: ${m || "Unknown error"}`);
        }
      } else {
        errors.push(`${r.title || r.id}: ${r.errorMessage || "Unknown error"}`);
      }
    }
    return errors;
  }, [base.error, base.errorMessage, fatalError, loaderErrors]);

  const hasError = errorMessages.length > 0;
  const errorSeverity = fatalError ? "error" : "warning";

  // Stabilize evalData — patientBundle.current is a ref mutated in place,
  // so spreading it directly produces a new object reference each render.
  const evalData = useMemo(
    () => patientBundle.current.evalResults ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase2Query.isSuccess, phase2Query.dataUpdatedAt],
  );

  const summaryKeys = useMemo(() => Object.keys(base.summaries), [base.summaries]);

  const patientBundleEntries = useMemo(
    () => patientBundle.current.entry,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase1Query.isSuccess, phase2Query.isSuccess],
  );

  if (isReady) {
    console.log("summaryData ", summaryData);
    console.log("reportData ", reportData);
  }

  return {
    ...evalData,
    isReady,
    errorMessages,
    errorSeverity,
    fatalError,
    hasError,
    summaryError: base.error,
    // to be loaded resources tracking
    toBeLoadedResources,

    // base (phase 1)
    questionnaireList: base.questionnaireList,
    questionnaires: base.questionnaires,
    questionnaireResponses: base.questionnaireResponses,
    summaries: base.summaries,
    summaryKeys,

    // phase 2
    evalData,

    // bundle
    patientBundle: patientBundleEntries,

    // summary data
    allScoringSummaryData,

    // chart
    allChartData,
    chartKeys,

    // reportData
    reportData,

    // controls
    refresh,
  };
}

// Export reducer for unit tests
export { reducer };
