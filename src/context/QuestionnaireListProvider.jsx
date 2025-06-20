import React, { useContext, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { NO_CACHE_HEADER } from "../consts/consts";
import { getFHIRResourceTypesToLoad, getFhirResourcesFromQueryResult, processPage } from "../util/fhirUtil";
import { getEnvQuestionnaireList, getEnv, isEmptyArray } from "../util/util";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "./FhirClientContext";

// let loadComplete = false;

export default function QuestionnaireListProvider({ children }) {
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
  // hook for tracking state
  const resourceReducer = (state, action) => {
    switch (action.type) {
      case "RESULTS":
        return {
          ...state,
          questionnaireList: action.questionnaireList,
          questionnaireResponses: action.questionnaireResponses,
          exactMatchById: !!action.exactMatchById,
          complete: true,
        };
      case "ERROR":
        return {
          ...state,
          error: true,
          errorMessage: action.message,
          complete: true,
        };
      default:
        return state;
    }
  };
  const [state, dispatch] = useReducer(resourceReducer, {
    questionnaireList: [],
    questionnaireResponses: [],
    exactMatchById: isFromEpic,
    error: false,
    errorMessage: "",
  });
  const { client, patient } = useContext(FhirClientContext);
  const resourceTypesToBeLoaded = getFHIRResourceTypesToLoad();
  const notConfigured = resourceTypesToBeLoaded.indexOf("Questionnaire") === -1;

  useEffect(() => {
    if (!client || !patient) {
      dispatch({
        type: "ERROR",
        errorMessage: "No FHIR client or patient provided",
      });
      return;
    }
    if (state.complete) return;

    if (notConfigured) {
      return;
    }

    const preloadQuestionnaireList = getEnvQuestionnaireList();
    let resources = [];
    // load questionnaires based on questionnaire responses
    client
      .request(
        {
          url: "QuestionnaireResponse?_count=200&patient=" + patient.id,
          header: NO_CACHE_HEADER,
        },
        {
          pageLimit: 0, // unlimited pages
          onPage: processPage(client, resources),
        },
      )
      .then(() => {
        const matchedResults = !isEmptyArray(resources)
          ? resources.filter((item) => item && item.questionnaire && item.questionnaire.split("/")[1])
          : null;
        console.log("matched results for questionnaire from QuestionnaireResponse ", matchedResults);
        if (!isEmptyArray(preloadQuestionnaireList)) {
          console.log("questionnaire list to load from environment variable ", preloadQuestionnaireList);
          dispatch({
            type: "RESULTS",
            questionnaireList: preloadQuestionnaireList,
            questionnaireResponses: getFhirResourcesFromQueryResult(matchedResults),
          });
          return;
        }
        if (isEmptyArray(matchedResults)) {
          dispatch({
            type: "ERROR",
            errorMessage: "No questionnaire list set.",
          });
          return;
        }
        const qIds = matchedResults.map((item) => item.questionnaire.split("/")[1]);
        let uniqueQIds = [...new Set(qIds)];
        console.log("questionnaire list from questionnaire responses to load ", uniqueQIds);
        dispatch({
          type: "RESULTS",
          questionnaireList: uniqueQIds,
          questionnaireResponses: getFhirResourcesFromQueryResult(matchedResults),
          exactMatchById: true,
        });
      })
      .catch((e) => {
        dispatch({
          type: "ERROR",
          errorMessage: e,
        });
      });
  }, [client, patient, state.complete, resourceTypesToBeLoaded, notConfigured]);

  return (
    <QuestionnaireListContext.Provider value={state}>
      <QuestionnaireListContext.Consumer>
        {({ questionnaireList, error }) => {
          // if client and patient are available render the children component(s)
          if (notConfigured || !isEmptyArray(questionnaireList) || error) {
            return children;
          }
          // loading
          return (
            <Stack spacing={2} direction="row" style={{ padding: "24px" }}>
              <CircularProgress></CircularProgress>
              <div>Loading...</div>
            </Stack>
          );
        }}
      </QuestionnaireListContext.Consumer>
    </QuestionnaireListContext.Provider>
  );
}

QuestionnaireListProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
