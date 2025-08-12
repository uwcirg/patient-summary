import { useCallback, useContext, useMemo, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import { FhirClientContext } from "@/context/FhirClientContext";
import { QuestionnaireListContext } from "@/context/QuestionnaireListContext";
import { NO_CACHE_HEADER } from "@/consts";
import {
  getResourcesByResourceType,
  getResourceTypesFromResources,
  getFhirResourcesFromQueryResult,
  getFHIRResourceTypesToLoad,
  getFHIRResourcePaths,
  processPage,
} from "@/util/fhirUtil";
import Questionnaire from "@/models/Questionnaire";
import FhirResultBuilder from "@/models/resultBuilders/FhirResultBuilder";
import { getChartConfig, isEmptyArray, isNumber } from "@/util";

export default function useFetchResources() {
  const SUMMARY_DATA_KEY = "summaryData";
  let loadedFHIRData = [];
  const { client, patient } = useContext(FhirClientContext);
  let {
    questionnaireList,
    exactMatchById,
    questionnaireResponses: ctxQuestionnaireResponseResources,
    questionnaires: ctxQuestionnaireResources,
  } = useContext(QuestionnaireListContext);
  const questionnareKeys = questionnaireList ? questionnaireList : [];
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

  const getResourcesToTrack = (resourceTypesToLoad, questionnareKeys) => {
    // all the resources that will be loaded
    let initialResourcesToLoad = [
      ...(resourceTypesToLoad ? resourceTypesToLoad : []).map((type) => ({
        id: type,
        complete: false,
        error: false,
      })),
    ];
    if (!isEmptyArray(questionnareKeys))
      initialResourcesToLoad.push({
        id: SUMMARY_DATA_KEY,
        title: `Resources for PRO data`,
        complete: false,
        error: false,
        data: null,
      });

    return initialResourcesToLoad;
  };

  const resourceTypesToLoad = getResourceTypesToLoad();

  // all the resources that will be loaded
  const initialResourcesToLoad = getResourcesToTrack(resourceTypesToLoad, questionnareKeys);

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

  // search for matching questionnaire
  const searchMatchingQuestionnaireResources = (questionnaireId, paramPatientBundle, exactMatchById) => {
    if (!questionnaireId || isEmptyArray(paramPatientBundle)) return null;
    const questionnaireResources = getResourcesByResourceType(paramPatientBundle, "Questionnaire");
    const returnResult = !isEmptyArray(questionnaireResources)
      ? questionnaireResources.find((resource) => {
          if (!exactMatchById) {
            const toMatch = String(questionnaireId).toLowerCase();
            const arrMatches = [String(resource.name).toLowerCase(), String(resource.id).toLowerCase()];
            return String(resource.id).toLowerCase() === toMatch || arrMatches.find((key) => key.includes(toMatch));
          }
          return resource.id === questionnaireId;
        })
      : null;
    if (returnResult) {
      return returnResult;
    }
    return null;
  };

  const getEvalResultsForQuestionnaire = (questionnaireJson, paramPatientBundle) => {
    if (!questionnaireJson) return null;
    const patientBundleToUse = !isEmptyArray(paramPatientBundle) ? JSON.parse(JSON.stringify(paramPatientBundle)) : [];
    const questionnaireObject = new Questionnaire(questionnaireJson, null, patientBundleToUse);
    const questionnaireId = questionnaireObject.id;
    const chartConfig = getChartConfig(questionnaireObject.id);
    let evalData;
    try {
      evalData = questionnaireObject.summary(patientBundleToUse);
    } catch (e) {
      console.log(e);
      throw new Error("Error building summary results for ", questionnaireId);
    }
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
    const scoringParams = !isEmptyArray(evalData) ? evalData[0].scoringParams : {};

    const returnResult = {
      config: questionnaireObject.summaryConfig,
      chartConfig: { ...chartConfig, ...scoringParams },
      chartData: chartData,
      scoringData: scoringData,
      responses: evalData,
      questionnaire: questionnaireJson,
    };
    return returnResult;
  };

  const gatherSummaryDataByQuestionnaireId = async (questionnaireId, exactMatchById, paramPatientBundle) => {
    // find matching questionnaire & questionnaire response(s)
    const result = searchMatchingQuestionnaireResources(questionnaireId, paramPatientBundle, exactMatchById);
    const bundles = getFhirResourcesFromQueryResult(result);
    const arrQuestionnaires = getResourcesByResourceType(bundles, "Questionnaire");
    const questionnaireJson = !isEmptyArray(arrQuestionnaires) ? arrQuestionnaires[0] : null;
    if (!questionnaireJson) {
      throw new Error("No matching questionnaire found.");
    }
    const data = getEvalResultsForQuestionnaire(questionnaireJson, paramPatientBundle);
    return {
      data: data,
      questionnaire: questionnaireJson,
    };
  };

  useQuery(
    "fhirResources",
    async () => {
      const results = await getFhirResources();
      return results;
    },
    {
      disabled: isReady(),
      refetchOnWindowFocus: false,
      onSettled: (fhirData) => {
        patientBundle.current = {
          ...patientBundle.current,
          entry: [...patientBundle.current.entry, ...fhirData],
        };
        if (isReady()) {
          return;
        }
        console.log("fhirData", fhirData);
        console.log("questionnaire list to load ", questionnaireList);
        const resourceEvalResults = resourceTypesToLoad.map((resource) => {
          return {
            [resource]: new FhirResultBuilder(fhirData).build(resource),
          };
        });

        const qListRequests = questionnaireList?.map((qid) => {
          return new Promise((resolve) => {
            gatherSummaryDataByQuestionnaireId(
              qid,
              exactMatchById,
              JSON.parse(JSON.stringify(patientBundle.current.entry)),
            )
              .then((results) => {
                const { data, questionnaire } = results;
                patientBundle.current = {
                  ...patientBundle.current,
                  questionnaire: questionnaire,
                };
                resolve({
                  [qid]: data,
                });
              })
              .catch((e) => {
                resolve({
                  [qid]: {
                    error: e,
                  },
                });
              });
          });
        });
        Promise.allSettled([...(qListRequests ?? []), ...(resourceEvalResults ?? [])]).then((results) => {
          let summaries = {};
          results.forEach((result) => {
            const resultValue = result.value ? result.value : {};
            const o = Object.entries(resultValue)[0];
            const key = o[0];
            const value = o[1];
            const isFHIRType = resourceTypesToLoad.indexOf(key) !== -1;
            if (isFHIRType) {
              patientBundle.current = {
                ...patientBundle.current,
                evalResults: {
                  ...patientBundle.current.evalResults,
                  ...resultValue,
                },
              };
            } else {
              summaries[key] = value;
            }
            if (value?.error) {
              handleResourceError(key);
              return true;
            }
          });
          console.log("patient bundle ", patientBundle.current);
          console.log("Summary data ", summaries);
          setTimeout(
            () =>
              handleResourceComplete(SUMMARY_DATA_KEY, {
                data: summaries,
              }),
            50,
          );
          handleResourceComplete(SUMMARY_DATA_KEY, {
            data: summaries,
          });
        });
      },
      onError: (e) => {
        setError("Error fetching FHIR resources. See console for detail.");
        console.log("FHIR resources fetching error: ", e);
      },
    },
  );

  const getFhirResources = async () => {
    if (!client || !patient || !patient.id) throw new Error("Client or patient missing.");
    const resources = getFHIRResourcePaths(patient.id, resourceTypesToLoad, {
      questionnaireList: questionnaireList,
      exactMatchById: exactMatchById,
    });
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
