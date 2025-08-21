import { useCallback, useContext, useMemo, useReducer, useRef, useState } from "react";
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
const BLOCKED_EXTRA_TYPES = new Set(["questionnaire", "questionnaireresponse"]);
const DEFAULT_QUERY_PARAMS = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: false,
};

// ---- Single-flight cache for phase-1 (per patient+run) ----
const PHASE1_FLIGHTS = new Map(); // key -> Promise<{questionnaires, questionnaireResponses, summaries, qListToLoad, exactMatchById}>

/** Runs phase-1 exactly once per key by returning the same Promise if already in-flight or completed. */
function runPhase1Once(key, fn) {
  if (PHASE1_FLIGHTS.has(key)) return PHASE1_FLIGHTS.get(key);
  const p = (async () => {
    try {
      return await fn();
    } finally {
      // Keep the promise cached so late subscribers use the same result.
      // delete if want to allow re-runs after it settles
      // PHASE1_FLIGHTS.delete(key);
    }
  })();
  PHASE1_FLIGHTS.set(key, p);
  return p;
}

/** ---- Base reducer (QRs/Qs/summaries) ---- */
function baseReducer(state, action) {
  switch (action.type) {
    case "RESULTS":
      return {
        ...state,
        questionnaireList: action.questionnaireList,
        questionnaireResponses: action.questionnaireResponses,
        questionnaires: action.questionnaires,
        summaries: action.summaries,
        exactMatchById: !!action.exactMatchById,
        loadedStatus: { questionnaire: false, questionnaireResponse: true },
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
        loadedStatus: { questionnaire: false, questionnaireResponse: false },
        complete: false,
        error: false,
        errorMessage: "",
      };
    default:
      return state;
  }
}

/** ---- Loader reducer for extra FHIR resources ---- */
function loaderReducer(state, action) {
  switch (action.type) {
    case "INIT_TRACKING":
      return action.items;
    case "COMPLETE":
      return state.map((r) => (r.id === action.id ? { ...r, data: action.data ?? r.data, complete: true } : r));
    case "ERROR":
      return state.map((r) => (r.id === action.id ? { ...r, complete: true, error: true } : r));
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
    loadedStatus: { questionnaire: false, questionnaireResponse: false },
    summaries: {},
    complete: false,
    error: false,
    errorMessage: "",
  });

  // phase-2 tracking
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
    // clear flight for this patient so phase-1 can re-run on refresh
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

  const phase1Query = useQuery(
    ["phase1-qr-obs-q", phase1Key],
    async () => {
      if (!client || !patient?.id) throw new Error("No FHIR client or patient provided");

      return runPhase1Once(phase1Key, async () => {
        const preloadList = getEnvQuestionnaireList();
        let qrResources = [];
        let obResources = [];

        // 1) Load QR + Obs
        await Promise.allSettled([
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

        let matchedQRs = !isEmptyArray(qrResources)
          ? qrResources.filter((it) => it && it.questionnaire && it.questionnaire.split("/")[1])
          : [];

        const hasPreload = !isEmptyArray(preloadList);
        if (!hasPreload && isEmptyArray(matchedQRs) && isEmptyArray(obResources)) {
          throw new Error("No questionnaire list set.");
        }

        let qIds = [...preloadList];
        let syntheticQs = [];

        // 2) From Obs, build synthetic Qs/QRs if configs match
        if (!isEmptyArray(obResources)) {
          let obsLinkIds = getLinkIdsFromObservations(obResources);
          if (!isEmptyArray(obsLinkIds)) {
            for (const key in questionnaireConfigs) {
              const cfg = questionnaireConfigs[key];
              if (hasPreload && !preloadList.find((q) => fuzzyMatch(q, key))) {
                continue;
              }
              const hit = cfg?.questionLinkIds?.find((linkId) => obsLinkIds.includes(normalizeLinkId(linkId)));
              if (hit) {
                if (cfg) {
                  const builtQ = buildQuestionnaire(cfg);
                  const builtQRs = observationsToQuestionnaireResponses(obResources, cfg);
                  console.log("built questionnaire ", builtQ);
                  console.log("buit QRs ", builtQRs);
                  syntheticQs = [...syntheticQs, builtQ];
                  matchedQRs = [...matchedQRs, ...builtQRs];
                  if (cfg.questionnaireId) qIds.push(cfg.questionnaireId);
                }
              }
            }
          }
        }

        // 3) Determine Q list and fetch Questionnaires
        const matchedQIds = matchedQRs?.map((it) => it.questionnaire?.split("/")[1]) ?? [];
        const uniqueQIds = [...new Set([...qIds, ...matchedQIds])];
        const qListToLoad = hasPreload ? preloadList : uniqueQIds;

        const qPath = getFHIRResourcePath(patient.id, ["Questionnaire"], {
          questionnaireList: qListToLoad,
          exactMatchById: !hasPreload || isFromEpic,
        });

        let qResources = [];
        await client.request(
          { url: qPath, header: NO_CACHE_HEADER },
          { pageLimit: 0, onPage: processPage(client, qResources) },
        );

        const questionnaires = [
          ...getFhirResourcesFromQueryResult(syntheticQs),
          ...getFhirResourcesFromQueryResult(qResources),
        ];
        const idsFromQuestionnaires = questionnaires.map((item) => item.resource.id);
        let questionnaireResponses = getFhirResourcesFromQueryResult(matchedQRs);
        if (!isEmptyArray(questionnaires)) {
          questionnaireResponses = questionnaireResponses.filter((item) => {
            const qId = String(item.resource?.questionnaire).split("/")[1];
            return idsFromQuestionnaires.indexOf(qId) !== -1;
          });
        }
        return {
          questionnaires,
          questionnaireResponses,
          //summaries,
          qListToLoad: qListToLoad,
          exactMatchById: !hasPreload || isFromEpic,
        };
      });
    },
    {
      ...DEFAULT_QUERY_PARAMS,
      enabled: !!client && !!patient?.id && !base.complete && !base.error && !!phase1Key,
      onSuccess: ({ questionnaires, questionnaireResponses, qListToLoad, exactMatchById }) => {
        // seed bundle
        patientBundle.current = {
          ...patientBundle.current,
          entry: [{ resource: patient }, ...questionnaireResponses, ...questionnaires],
        };

        // commit base results
        dispatchBase({
          type: "RESULTS",
          questionnaireList: qListToLoad,
          questionnaires,
          questionnaireResponses,
          //summaries,
          exactMatchById,
        });

        // compute extra resource types for phase-2
        const haveTypes = [
          ...new Set(getResourceTypesFromResources(questionnaires).map((r) => String(r).toLowerCase())),
          ...new Set(getResourceTypesFromResources(questionnaireResponses).map((r) => String(r).toLowerCase())),
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
          const tracking = [
            ...uniqWanted.map((t) => ({ id: t, complete: false, error: false })),
            {
              id: SUMMARY_DATA_KEY,
              title: "Waiting for all summary data ...",
              complete: false,
              error: false,
              data: null,
            },
          ];
          dispatchLoader({ type: "INIT_TRACKING", items: tracking });
        } else {
          dispatchLoader({
            type: "INIT_TRACKING",
            items: [
              {
                id: SUMMARY_DATA_KEY,
                title: "Summary data",
                complete: true,
                error: false,
                data: getSummaries(patientBundle.current.entry),
              },
            ],
          });
        }
      },
      onError: (e) => {
        dispatchBase({ type: "ERROR", errorMessage: e?.message ?? String(e) });
      },
    },
  );

  /** -------------------- Phase 2 via React Query -------------------- */
  const readyForExtras =
    !!client &&
    !!patient?.id &&
    base.complete &&
    !base.error &&
    extraTypes.length > 0 &&
    toBeLoadedResources.length > 0;

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
          dispatchLoader({ type: "ERROR", id: p.resourceType });
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

  const summaryData = useMemo(() => toBeLoadedResources.find((r) => r.id === SUMMARY_DATA_KEY), [toBeLoadedResources]);

  const hasSummaryData = useMemo(() => {
    if (!summaryData || !summaryData.data) return false;
    const keys = Object.keys(summaryData.data);
    return !!keys.find(
      (key) => summaryData.data[key] && (summaryData.data[key].error || !isEmptyArray(summaryData.data[key].responses)),
    );
  }, [summaryData]);

  const allChartData = useMemo(() => {
    if (!isReady || !hasSummaryData) return null;
    const dataToUse = JSON.parse(JSON.stringify(summaryData.data));
    const keys = Object.keys(dataToUse);
    const formatted = keys.map((key) => {
      const d = dataToUse[key];
      if (!d || isEmptyArray(d.chartData)) return [];
      const series = d.chartConfig?.dataFormatter ? d.chartConfig.dataFormatter(d.chartData) : d.chartData;
      return series.map((o) => ({ ...o, key, [key]: o.score }));
    });
    return formatted.flat().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [isReady, hasSummaryData, summaryData]);

  const loading =
    (phase1Query.isLoading && !base.complete) ||
    (!base.complete && !base.error) ||
    (base.complete && extraTypes.length > 0 && !phase2DoneOrSkipped && !base.error);

  return {
    // status
    loading,
    isReady,
    error: error || (base.error ? base.errorMessage : null),

    // base (phase 1)
    questionnaireList: base.questionnaireList,
    questionnaires: base.questionnaires,
    questionnaireResponses: base.questionnaireResponses,
    summaries: base.summaries,
    loadingFlags: base.loadedStatus,

    // phase 2
    toBeLoadedResources,
    evalData: patientBundle.current.evalResults,

    // bundle
    patientBundle: patientBundle.current.entry,

    // charts
    summaryData,
    allChartData,

    // bool
    hasSummaryData,

    // controls
    refresh,
  };
}
