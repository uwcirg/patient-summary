import { useContext, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import { FhirClientContext } from "../context/FhirClientContext";
import { QuestionnaireListContext } from "../context/QuestionnaireListContext";
import {
  gatherSummaryDataByQuestionnaireId,
  getFhirResourcesFromQueryResult,
  getFHIRResourcesToLoad,
  getFHIRResourcePaths,
} from "../util/util";
import qConfig from "../config/questionnaire_config";

export default function useFetchResources() {
  const { client, patient } = useContext(FhirClientContext);
  let { questionnaireList, questionnaireResponses } = useContext(
    QuestionnaireListContext
  );
  const questionnareKeys =
    questionnaireList && questionnaireList.length
      ? questionnaireList.map((q) => q.id)
      : [];
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
    entry: [{ resource: patient }, ...questionnaireResponses],
    loadComplete: false,
  });
  const [error, setError] = useState(null);

  // all the resources that will be loaded
  const initialResourcesToLoad = [
    ...getFHIRResourcesToLoad().map((resource) => ({
      id: resource,
      complete: false,
      error: false,
    })),
    ...questionnareKeys.map((qid) => ({
      id: qid,
      title:
        qConfig[qid] && qConfig[qid].shortTitle
          ? `Questionnaire ${qConfig[qid].shortTitle}`
          : `Questionnaire ${qid}`,
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
        if (!questionnaireList.length) {
          onErrorCallback();
          return;
        }
        if (summaryData.loadComplete) return;
        console.log("patient bundle ", patientBundle.current);
        console.log("fhirData", fhirData);
        const requests = questionnaireList.map((o) =>
          (async () => {
            let error = "";
            const qid = o.id;
            let results = await gatherSummaryDataByQuestionnaireId(
              client,
              patientBundle.current,
              o.id
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
          console.log("results ", results)
          let summaries = {};
          results.forEach((result) => {
            if (result.status === "rejected") return true;
            console.log("result ? ", result)
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
    const resources = getFHIRResourcePaths(patient.id);
    const requests = resources.map((resource) =>
      client
        .request(resource.resourcePath)
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
    questionnareKeys: questionnaireList.map((q) => q.id),
    questionnaireList: questionnaireList,
  };
}
