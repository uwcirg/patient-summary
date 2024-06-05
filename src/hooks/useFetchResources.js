import { useContext, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import { FhirClientContext } from "../context/FhirClientContext";
import { QuestionnaireListContext } from "../context/QuestionnaireListContext";
import QuestionnaireConfig from "../config/questionnaire_config";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import { initialzieCqlWorker } from "cql-worker";
import {
  getChartConfig,
  getElmDependencies,
  getInterventionLogicLib,
  isNumber,
} from "../util/util";
import {
  getResourcesByResourceType,
  getFhirResourcesFromQueryResult,
  getFHIRResourcesToLoad,
  getFHIRResourcePaths,
} from "../util/fhirUtil";
import qConfig from "../config/questionnaire_config";

export default function useFetchResources() {
  const { client, patient } = useContext(FhirClientContext);
  let { questionnaireList, exactMatch } = useContext(QuestionnaireListContext);
  const questionnareKeys =
    questionnaireList && questionnaireList.length ? questionnaireList : [];
  const [summaryData, setSummaryData] = useState({
    data: questionnareKeys.map((qid) => {
      return { [qid]: null };
    }),
    loadComplete: false,
  });
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [{ resource: patient }],
    loadComplete: false,
  });
  const [error, setError] = useState(null);

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

  const resourcesToLoad = getResourcesToLoad();

  // all the resources that will be loaded
  const initialResourcesToLoad = [
    ...resourcesToLoad.map((resource) => ({
      id: resource,
      complete: false,
      error: false,
    })),
    ...questionnareKeys.map((qid) => ({
      id: qid,
      title:
        qConfig[qid] && qConfig[qid].shortTitle
          ? `Data for Questionnaire ${qConfig[qid].shortTitle}`
          : `Data for Questionnaire ${qid}`,
      complete: false,
      error: false,
    })),
  ];
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

  const gatherSummaryDataByQuestionnaireId = (
    questionnaireId,
    exactMatch,
    patientBundle
  ) => {
    return new Promise((resolve, reject) => {
      // search for matching questionnaire
      const searchMatchingQuestionnaireResources = async () => {
        const storageKey = `questionnaire_${questionnaireId}`;
        const storageQuestionnaire = sessionStorage.getItem(storageKey);
        if (storageQuestionnaire) return JSON.parse(storageQuestionnaire);
        const questionnaireResources = getResourcesByResourceType(
          patientBundle,
          "Questionnaire"
        );
        console.log("patient Bundle ", patientBundle);
        console.log("questionnaireResources ", questionnaireResources);
        const returnResult = questionnaireResources
          ? questionnaireResources.filter((resource) => {
              if (!exactMatch) {
                const arrMatches = [String(resource.name).toLowerCase()];
                const toMatch = String(questionnaireId).toLowerCase();
                return (
                  String(resource.id).toLowerCase() === toMatch ||
                  arrMatches.find((key) => key.includes(toMatch))
                );
              }
              return resource.id === questionnaireId;
            })
          : null;
        if (returnResult && returnResult.length) {
          sessionStorage.setItem(storageKey, JSON.stringify(returnResult[0]));
          return returnResult[0];
        }
        return null;
      };
      const gatherSummaryData = async (questionnaireJson) => {
        // Define a web worker for evaluating CQL expressions
        const cqlWorker = new Worker();
        // Initialize the cql-worker
        const [setupExecution, sendPatientBundle, evaluateExpression] =
          initialzieCqlWorker(cqlWorker);
        const questionaireKey = String(questionnaireId).toLowerCase();
        const matchedKeys = Object.keys(QuestionnaireConfig).filter((id) => {
          const match = String(id).toLowerCase();
          return (
            String(questionnaireJson.id).toLowerCase() === match ||
            String(questionnaireJson.name).toLowerCase().includes(match)
          );
        });
        const targetQId = matchedKeys.length ? matchedKeys[0] : questionaireKey;
        // console.log("matched item from qConfig ", matchedKeys);
        // console.log("questionnaireJSON ", questionnaireJson);
        // console.log("matched target  ", targetQId);
        const chartConfig = getChartConfig(targetQId);
        const questionnaireConfig = QuestionnaireConfig[targetQId] || {};

        /* get CQL expressions */
        const [elmJson, valueSetJson] = await getInterventionLogicLib(
          questionnaireConfig.customCQL ? targetQId : ""
        ).catch((e) => {
          console.log("Error retrieving ELM lib son for " + questionnaireId, e);
          throw new Error(
            "Error retrieving ELM lib son for " + questionnaireId
          );
        });
        setupExecution(
          elmJson,
          valueSetJson,
          {
            QuestionnaireID: questionnaireJson.id,
            QuestionnaireName: questionnaireJson.name,
          },
          getElmDependencies()
        );

        // Send patient info to CQL worker to process
        sendPatientBundle(patientBundle);

        //debug
        // const cqlResponses = await evaluateExpression("QuestionnaireResponses");
        // console.log("responses from CQL? ", cqlResponses);
        // const cqlQuestionnaireName = await evaluateExpression(
        //   "CurrentQuestionnaireName"
        // ).catch((e) => {
        //   console.log("CurrentQuestionnaireName expression error ", e);
        // });
        // console.log("responses from CQL? ", cqlQuestionnaireName);
        // const cqlQuestionnairID = await evaluateExpression(
        //   "CurrentQuestionnaireID"
        // ).catch((e) => {
        //   console.log("CurrentQuestionnaireID expression error ", e);
        // });
        // console.log("responses from CQL? ", cqlQuestionnairID);

        // get formatted questionnaire responses
        let cqlData = null;
        try {
          cqlData = await evaluateExpression("ResponsesSummary").catch((e) => {
            console.log(e);
            throw new Error(
              "CQL evaluation expression, ResponsesSummary, error "
            );
          });
        } catch (e) {
          console.log("Error executing CQL expression: ", e);
        }
        const scoringData =
          cqlData && Array.isArray(cqlData) && cqlData.length
            ? cqlData.filter((item) => {
                return (
                  item && item.responses && isNumber(item.score) && item.date
                );
              })
            : null;
        const chartData =
          scoringData && scoringData.length
            ? scoringData.map((item) => ({
                ...item,
                ...(item.scoringParams ? item.scoringParams : {}),
                date: item.date,
                total: item.score,
              }))
            : null;
        const scoringParams =
          cqlData && cqlData.length ? cqlData[0].scoringParams : {};

        const returnResult = {
          chartConfig: { ...chartConfig, ...scoringParams },
          chartData: chartData,
          responses: cqlData,
          questionnaire: questionnaireJson,
        };
        console.log(
          "return result from CQL execution for " + questionnaireId,
          returnResult
        );
        cqlWorker.terminate();
        return returnResult;
      };

      // find matching questionnaire & questionnaire response(s)
      searchMatchingQuestionnaireResources()
        .then((result) => {
          if (!result) {
            reject("No questionnaire results found.");
            return;
          }
          let bundles = [];
          if (Array.isArray(result)) {
            result.forEach((item) => {
              bundles = [...bundles, ...getFhirResourcesFromQueryResult(item)];
            });
          } else
            bundles = [...bundles, ...getFhirResourcesFromQueryResult(result)];
          const arrQuestionnaires = bundles.filter(
            (entry) =>
              entry.resource &&
              String(entry.resource.resourceType).toLowerCase() ===
                "questionnaire"
          );
          const questionnaireJson = arrQuestionnaires.length
            ? arrQuestionnaires[0].resource
            : null;
          if (!questionnaireJson) {
            reject("No matching questionnaire found");
            return;
          }
          patientBundle = {
            ...patientBundle,
            entry: [...patientBundle, ...bundles],
            questionnaire: questionnaireJson,
          };
          gatherSummaryData(questionnaireJson)
            .then((data) => {
              resolve(data);
            })
            .catch((e) => {
              reject(
                "Error occurred gathering summary data.  See console for detail."
              );
              console.log("Error occurred gathering summary data: ", e);
            });
        })
        .catch((e) => {
          reject("Error occurred retrieving matching resources");
          console.log("Error occurred retrieving matching resources: ", e);
        });
    }); // end promise
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
          loadComplete: true,
        };
        // if (!questionnaireList.length) {
        //   onErrorCallback();
        //   return;
        // }
        if (summaryData.loadComplete) return;
        console.log("patient bundle ", patientBundle.current);
        console.log("fhirData", fhirData);
        console.log("questionnaire list to load ", questionnaireList);
        console.log("exact match ", exactMatch);
        const requests = questionnaireList.map((qid) =>
          (async () => {
            let error = "";
            let results = await gatherSummaryDataByQuestionnaireId(
              qid,
              exactMatch,
              patientBundle.current.entry
            ).catch((e) => (error = e));
            if (error) handleResourceError(qid);
            else handleResourceComplete(qid);
            return {
              [qid]: error
                ? {
                    error: error,
                  }
                : results,
            };
          })()
        );
        Promise.allSettled(requests).then((results) => {
          if (!results || !results.length) {
            onErrorCallback();
            return;
          }
          let summaries = {};
          results.forEach((result) => {
            if (result.status === "rejected") return true;
            if (result.value) {
              const o = Object.entries(result.value)[0];
              const key = o[0];
              summaries[key] = o[1];
              if (o[1].questionnaire) {
                questionnaireList.forEach((q) => {
                  if (q.id === key) {
                    q.questionnaireJson = o[1].questionnaire;
                  }
                });
              }
            }
          });

          console.log("Summary data ", summaries);

          setSummaryData({
            data: summaries,
            loadComplete: true,
          });
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
  };

  const isReady = () => summaryData.loadComplete || error;

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
    // bundle.push({ resource: patient });
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
    summaryData: summaryData,
    questionnareKeys: questionnaireList,
    questionnaireList: questionnaireList,
  };
}
