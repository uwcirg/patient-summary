import { useCallback, useContext, useMemo, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import { FhirClientContext } from "@/context/FhirClientContext";
import { QuestionnaireListContext } from "@/context/QuestionnaireListContext";
import { NO_CACHE_HEADER } from "@/consts";
import {
  getResourceTypesFromResources,
  getFhirResourcesFromQueryResult,
  getFHIRResourceTypesToLoad,
  getFHIRResourcePaths,
  processPage,
} from "@/util/fhirUtil";
import { isEmptyArray } from "@/util";

export default function useFetchResources() {
  const SUMMARY_DATA_KEY = "summaryData";
  let loadedFHIRData = [];
  const { client, patient } = useContext(FhirClientContext);
  let {
    questionnaireList,
    exactMatchById,
    questionnaireResponses: ctxQuestionnaireResponseResources,
    questionnaires: ctxQuestionnaireResources,
    summaries,
  } = useContext(QuestionnaireListContext);
  const [error, setError] = useState(null);
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [{ resource: patient }, ...(ctxQuestionnaireResponseResources ?? []), ...(ctxQuestionnaireResources ?? [])],
    evalResults: {},
  });

  const getResourceTypesToLoad = () => {
    const existingResources = [
      ...new Set(getResourceTypesFromResources(ctxQuestionnaireResources).map((r) => String(r).toLowerCase())),
      ...new Set(getResourceTypesFromResources(ctxQuestionnaireResponseResources).map((r) => String(r).toLowerCase())),
    ];
    let resources = getFHIRResourceTypesToLoad().filter((r) => {
      return existingResources.indexOf(String(r).toLowerCase()) === -1;
    });
    const resourcesToLoad = [...new Set(resources.flat())];
    // patient resource is loaded already
    return resourcesToLoad.filter((resource) => String(resource).toLowerCase() !== "patient");
  };

  const getResourcesToTrack = (resourceTypesToLoad) => {
    // all the resources that will be loaded
    let initialResourcesToLoad = [
      ...(resourceTypesToLoad ? resourceTypesToLoad : []).map((type) => ({
        id: type,
        complete: false,
        error: false,
      })),
    ];
      initialResourcesToLoad.push({
        id: SUMMARY_DATA_KEY,
        title: `Waiting for all summary data ...`,
        complete: false,
        error: false,
        data: null,
      });
    

    return initialResourcesToLoad;
  };

  const resourceTypesToLoad = getResourceTypesToLoad();
  const initialResourcesToLoad = getResourcesToTrack(resourceTypesToLoad);

  // hook for tracking resource load state
  const resourceReducer = (state, action) => {
    switch (action.type) {
      case "COMPLETE":
        return state.map((resource) => {
          if (resource.id === action.id) {
            return { ...resource, data: action.data, complete: true };
          } else {
            return resource;
          }
        });
      case "ERROR":
        return state.map((resource) => {
          if (resource.id === action.id) {
            return { ...resource, complete: true, error: true };
          } else {
            return resource;
          }
        });
      default:
        return state;
    }
  };

  const [toBeLoadedResources, dispatch] = useReducer(resourceReducer, initialResourcesToLoad);

  const isReady = useCallback(
    () => isEmptyArray(toBeLoadedResources) || !toBeLoadedResources.find((o) => !o.complete) || error,
    [error, toBeLoadedResources],
  );

  const handleResourceComplete = (resource, params) => {
    dispatch({ type: "COMPLETE", id: resource, ...params });
  };

  const handleResourceError = (resource) => {
    dispatch({ type: "ERROR", id: resource });
  };

  useQuery(
    "fhirResources",
    async () => {
      const results = await getFhirResources({
        questionnaireList: questionnaireList,
        exactMatchById: exactMatchById,
      });
      return results;
    },
    {
      disabled: isReady(),
      refetchOnWindowFocus: false,
      onSettled: (fhirData) => {
        console.log("FHIR data ", fhirData);
        if (isReady()) {
          return;
        }
        import("@/models/resultBuilders/FhirResultBuilder").then((result) => {
          const {default: FhirResultBuilder} = result;
          const resourceEvalResults = resourceTypesToLoad.map((resource) => {
            return {
              [resource]: new FhirResultBuilder(fhirData).build(resource),
            };
          });

          patientBundle.current = {
            ...patientBundle.current,
            entry: [...patientBundle.current.entry, ...fhirData],
            evalResults: {
              ...patientBundle.current.evalResults,
              ...Object.assign({}, ...(resourceEvalResults ?? [])),
            },
          };
          // let summaries = {};
          // const bundle = JSON.parse(JSON.stringify(patientBundle.current.entry));
          // questionnaireList?.map((qid) => {
          //   try {
          //     const data = getSummaryDataByQuestionnaireId(qid, exactMatchById, bundle);
          //     summaries[qid] = data;
          //     handleResourceComplete(qid, {
          //       data: data,
          //     });
          //   } catch (e) {
          //     console.log(e);
          //     handleResourceError(qid);
          //   }
          // });
          console.log("patient bundle ", patientBundle.current);
          console.log("Summary data ", summaries);
          setTimeout(
            () =>
              handleResourceComplete(SUMMARY_DATA_KEY, {
                data: summaries??{},
              }),
            150,
          );
        });
      },
      onError: (e) => {
        setError("Error fetching FHIR resources. See console for detail.");
        console.log("FHIR resources fetching error: ", e);
      },
    },
  );

  const getFhirResources = async (params = {}) => {
    if (!client || !patient || !patient.id) throw new Error("Client or patient missing.");
    const resources = getFHIRResourcePaths(patient.id, resourceTypesToLoad, params);
    const requests = resources.map((resource) =>
      client
        .request(
          { url: resource.resourcePath, header: NO_CACHE_HEADER },
          {
            pageLimit: 0, // unlimited pages
            onPage: processPage(client, loadedFHIRData),
          },
        )
        .then(() => {
          handleResourceComplete(resource.resourceType);
          return loadedFHIRData;
        })
        .catch((e) => {
          handleResourceError(resource.resourceType);
          throw new Error(e);
        }),
    );
    if (!requests.length) {
      console.log("No FHIR resource(s) specified.");
      return [];
    }
    let bundle = [];
    return Promise.allSettled(requests).then(
      (results) => {
        results.forEach((item) => {
          if (item.status === "rejected") {
            console.log("Fhir resource retrieval error ", item.reason);
            return true;
          }
          const result = item.value;
          bundle = [...bundle, ...getFhirResourcesFromQueryResult(result)];
        });
        return bundle;
      },
      (e) => {
        throw new Error(e);
      },
    );
  };

  const getAllChartData = useCallback(
    (summaryData) => {
      if (!isReady() || !summaryData || !summaryData.data) return null;
      const dataToUse = Object.assign({}, JSON.parse(JSON.stringify(summaryData.data)));
      const keys = Object.keys(dataToUse);
      const formattedData = keys.map((key) => {
        const data = dataToUse[key];
        if (!data || isEmptyArray(data.chartData)) return [];
        let dataToReturn = [];
        if (data.chartConfig && data.chartConfig.dataFormatter) {
          dataToReturn = data.chartConfig.dataFormatter(data.chartData);
        } else dataToReturn = data.chartData;
        {
          return dataToReturn.map((o) => {
            o.key = key;
            o[key] = o["score"];
            return o;
          });
        }
      });
      return formattedData.flat().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    [isReady],
  );

  const summaryData = toBeLoadedResources.find((resource) => resource.id === SUMMARY_DATA_KEY);
  const allChartData = useMemo(() => getAllChartData(summaryData), [summaryData, getAllChartData]);

  return {
    isReady: isReady(),
    error: error,
    toBeLoadedResources: toBeLoadedResources,
    patientBundle: patientBundle.current.entry,
    evalData: patientBundle.current.evalResults,
    summaryData: summaryData,
    allChartData: allChartData,
    questionnaireList: questionnaireList,
  };
}
