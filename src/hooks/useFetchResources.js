import { useContext, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import { FhirClientContext } from "../context/FhirClientContext";
import { QuestionnaireListContext } from "../context/QuestionnaireListContext";
import {
  evalExpressionForIntervention,
  getChartConfig,
  getElmDependencies,
  getResourceLogicLib,
  getInterventionLogicLib,
  isEmptyArray,
  isNumber,
} from "../util/util";
import {
  getResourcesByResourceType,
  getFhirResourcesFromQueryResult,
  getFHIRResourcesToLoad,
  getFHIRResourcePaths,
} from "../util/fhirUtil";
import Questionnaire from "../models/Questionnaire";

export default function useFetchResources() {
  const SUMMARY_DATA_KEY = "summaryData";
  const { client, patient } = useContext(FhirClientContext);
  let { questionnaireList, exactMatch } = useContext(QuestionnaireListContext);
  const questionnareKeys = !isEmptyArray(questionnaireList)
    ? questionnaireList
    : [];
  const [summaryData, setSummaryData] = useState({
    data: questionnareKeys.map((qid) => {
      return { [qid]: null };
    }),
    loadComplete: false,
  });
  const [error, setError] = useState(null);
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [{ resource: patient }],
    evalResults: {},
    loadComplete: false,
  });

  const getResourcesToLoad = () => {
    let resources = getFHIRResourcesToLoad();
    if (!questionnaireList || !questionnaireList.length) {
      const qIndex = resources
        .map((resource) => String(resource).toLowerCase())
        .indexOf("questionnaire");
      if (qIndex !== -1) resources.splice(qIndex, 1);
    }
    return resources;
  };

  const getResourcesToTrack = (resourcesToLoad, questionnareKeys) => {
    // all the resources that will be loaded
    let initialResourcesToLoad = [
      ...(resourcesToLoad ?? []).map((resource) => ({
        id: resource,
        complete: false,
        error: false,
      })),
    ];
    if (!isEmptyArray(questionnareKeys))
      initialResourcesToLoad.push({
        id: SUMMARY_DATA_KEY,
        title: `Resources for summary data`,
        complete: false,
        error: false,
      });

    return initialResourcesToLoad;
  };

  const resourcesToLoad = getResourcesToLoad();

  // all the resources that will be loaded
  const initialResourcesToLoad = getResourcesToTrack(
    resourcesToLoad,
    questionnareKeys
  );

  // hook for tracking resource load state
  const resourceReducer = (state, action) => {
    switch (action.type) {
      case "COMPLETE":
        return state.map((resource) => {
          if (resource.id === action.id) {
            return { ...resource, complete: true };
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

  const [toBeLoadedResources, dispatch] = useReducer(
    resourceReducer,
    initialResourcesToLoad
  );

  const handleResourceComplete = (resource) => {
    dispatch({ type: "COMPLETE", id: resource });
  };

  const handleResourceError = (resource) => {
    dispatch({ type: "ERROR", id: resource });
  };

  const gatherSummaryDataByQuestionnaireId = async (
    questionnaireId,
    exactMatch,
    patientBundle
  ) => {
    // search for matching questionnaire
    const searchMatchingQuestionnaireResources = async () => {
      const storageKey = `questionnaire_${questionnaireId}`;
      const storageQuestionnaire = sessionStorage.getItem(storageKey);
      if (storageQuestionnaire) return JSON.parse(storageQuestionnaire);
      const questionnaireResources = getResourcesByResourceType(
        patientBundle,
        "Questionnaire"
      );
      console.log(
        `questionnaireResources for ${questionnaireId}`,
        questionnaireResources
      );
      const returnResult = questionnaireResources
        ? questionnaireResources.find((resource) => {
            if (!exactMatch) {
              const toMatch = String(questionnaireId).toLowerCase();
              const arrMatches = [
                String(resource.name).toLowerCase(),
                String(resource.id).toLowerCase(),
              ];
              return (
                String(resource.id).toLowerCase() === toMatch ||
                arrMatches.find((key) => key.includes(toMatch))
              );
            }
            return resource.id === questionnaireId;
          })
        : null;
      if (returnResult) {
        sessionStorage.setItem(storageKey, JSON.stringify(returnResult));
        return returnResult;
      }
      return null;
    };
    const gatherSummaryData = async (questionnaireJson) => {
      const questionnaireObject = new Questionnaire(questionnaireJson);
      const interventionLibId = questionnaireObject.interventionLibId;
      const chartConfig = getChartConfig(questionnaireObject.id);
      /* get CQL expressions */
      const [elmJson, valueSetJson] = await getInterventionLogicLib(
        interventionLibId
      ).catch((e) => {
        console.log("Error retrieving ELM lib son for " + questionnaireId, e);
        throw new Error("Error retrieving ELM lib son for " + questionnaireId);
      });
      // get formatted questionnaire responses
      let cqlData = null;
      try {
        const evalResult = await evalExpressionForIntervention(
          "ResponsesSummary",
          elmJson,
          getElmDependencies(),
          valueSetJson,
          patientBundle,
          {
            QuestionnaireID: questionnaireObject.id,
            QuestionnaireName: questionnaireObject.name,
          }
        ).catch((e) => {
          console.log(e);
          throw new Error(
            "CQL evaluation expression, ResponsesSummary, error "
          );
        });
        if (evalResult) {
          cqlData = await evalResult;
        }
      } catch (e) {
        console.log("Error executing CQL expression: ", e);
        throw new Error(e);
      }
      const scoringData = !isEmptyArray(cqlData)
        ? cqlData.filter((item) => {
            return (
              item &&
              !isEmptyArray(item.responses) &&
              isNumber(item.score) &&
              item.date
            );
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
      const scoringParams = !isEmptyArray(cqlData)
        ? cqlData[0].scoringParams
        : {};

      const returnResult = {
        chartConfig: { ...chartConfig, ...scoringParams },
        chartData: chartData,
        scoringData: scoringData,
        responses: cqlData,
        questionnaire: questionnaireJson,
      };
      console.log(
        "return result from CQL execution for " + questionnaireId,
        returnResult
      );
      return returnResult;
    };

    // find matching questionnaire & questionnaire response(s)
    const result = await searchMatchingQuestionnaireResources().catch((e) => {
      throw new Error(e);
    });

    let bundles = [];
    if (Array.isArray(result)) {
      result.forEach((item) => {
        bundles = [...bundles, ...getFhirResourcesFromQueryResult(item)];
      });
    } else bundles = [...bundles, ...getFhirResourcesFromQueryResult(result)];
    const arrQuestionnaires = bundles.filter(
      (entry) =>
        entry.resource &&
        String(entry.resource.resourceType).toLowerCase() === "questionnaire"
    );
    const questionnaireJson = !isEmptyArray(arrQuestionnaires)
      ? arrQuestionnaires[0].resource
      : null;
    if (!questionnaireJson) {
      throw new Error("No matching questionnaire found");
    }
    patientBundle = {
      ...patientBundle,
      entry: [...patientBundle, ...bundles],
      questionnaire: questionnaireJson,
    };
    const data = await gatherSummaryData(questionnaireJson).catch((e) => {
      console.log("Error occurred gathering summary data: ", e);
      throw new Error(
        "Error occurred gathering summary data.  See console for detail."
      );
    });

    return data;
  };

  useQuery(
    "fhirResources",
    async () => {
      const results = await getFhirResources();
      return results;
    },
    {
      disabled: patientBundle.current.loadComplete || error,
      refetchOnWindowFocus: false,
      onSettled: (fhirData) => {
        patientBundle.current = {
          ...patientBundle.current,
          entry: [...patientBundle.current.entry, ...fhirData],
        };
        if (summaryData.loadComplete) {
          return;
        }
        console.log("fhirData", fhirData);
        console.log("questionnaire list to load ", questionnaireList);
        const promiseEvals = resourcesToLoad.map((resource) => {
          return new Promise((resolve) => {
            getResourceLogicLib(resource)
              .then((libResult) => {
                const [elmJson, valueSetJson] = libResult;
                if (!elmJson) {
                  resolve({
                    [resource]: null,
                  });
                  return;
                }
                evalExpressionForIntervention(
                  "Results",
                  elmJson,
                  getElmDependencies(),
                  valueSetJson,
                  patientBundle.current
                )
                  .then((evalResult) => {
                    resolve({
                      [resource]: evalResult,
                    });
                  })
                  .catch((e) => {
                    console.log(
                      "Error evaluating expression for " + resource,
                      e
                    );
                    resolve({
                      [resource]: {
                        error: e,
                      },
                    });
                  });
              })
              .catch((e) => {
                console.log("Error retrieving ELM lib son for " + resource, e);
                resolve({
                  [resource]: {
                    error: e,
                  },
                });
              });
          });
        });
        const qlRequests = questionnaireList.map((qid) => {
          return new Promise((resolve) => {
            gatherSummaryDataByQuestionnaireId(
              qid,
              exactMatch,
              patientBundle.current.entry
            )
              .then((results) => {
                resolve({
                  [qid]: results,
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
        Promise.allSettled([...qlRequests, ...promiseEvals]).then((results) => {
          let summaries = {};
          results.forEach((result) => {
            const o = Object.entries(result.value ?? {})[0];
            const key = o[0];
            const value = o[1];
            if (value?.error) {
              handleResourceError(key);
              return true;
            }

            if (resourcesToLoad.indexOf(key) !== -1) {
              patientBundle.current = {
                ...patientBundle.current,
                evalResults: {
                  ...patientBundle.current.evalResults,
                  ...(result.value ?? {}),
                },
              };
            } else {
              if (summaries[key]) return true;
              summaries[key] = o[1];
              if (o[1]?.questionnaire) {
                questionnaireList.forEach((q) => {
                  if (q.id === key) {
                    q.questionnaireJson = o[1].questionnaire;
                  }
                });
              }
            }
          });
          patientBundle.current = {
            ...patientBundle.current,
            loadComplete: true,
          };
          console.log("patient bundle ", patientBundle.current);
          console.log("Summary data ", summaries);
          handleResourceComplete(SUMMARY_DATA_KEY);
          setTimeout(
            () =>
              setSummaryData({
                data: summaries,
                loadComplete: true,
              }),
            250
          );
        });
      },
      onError: (e) => {
        onErrorCallback(
          "Error fetching FHIR resources. See console for detail."
        );
        console.log("FHIR resources fetching error: ", e);
      },
    }
  );

  const onErrorCallback = (message) => {
    if (message) setError(message);
    setSummaryData({
      data: null,
      loadComplete: true,
    });
    handleResourceError(SUMMARY_DATA_KEY);
  };

  const isReady = () =>
    (patientBundle.current.loadComplete && summaryData.loadComplete) || error;

  const getFhirResources = async () => {
    if (!client || !patient || !patient.id)
      throw new Error("Client or patient missing.");
    const resources = getFHIRResourcePaths(patient.id, resourcesToLoad, {
      questionnaireList: questionnaireList,
      exactMatch: exactMatch,
    });
    const requests = resources.map((resource) =>
      client
        .request(resource.resourcePath, {
          "Cache-Control": "no-cache, no-store, max-age=0",
        })
        .then((result) => {
          handleResourceComplete(resource.resourceType);
          return result;
        })
        .catch((e) => {
          handleResourceError(resource.resourceType);
          throw new Error(e);
        })
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
      }
    );
  };

  return {
    isReady: isReady(),
    error: error,
    toBeLoadedResources: toBeLoadedResources,
    patientBundle: patientBundle.current.entry,
    evalData: patientBundle.current.evalResults,
    summaryData: summaryData,
    questionnareKeys: questionnaireList,
    questionnaireList: questionnaireList,
  };
}
