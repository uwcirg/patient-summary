import React, { useContext, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { getEnvQuestionnaireList, getEnv, isEmptyArray } from "../util/util";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "./FhirClientContext";

// let loadComplete = false;

export default function QuestionnaireListProvider({ children }) {
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
  // hook for tracking state
  const resourceReducer = (state, action) => {
    switch (action.type) {
      case "LIST":
        return {
          ...state,
          questionnaireList: action.questionnaireList,
          exactMatch: !!action.exactMatch,
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
    exactMatch: isFromEpic,
    error: false,
    errorMessage: "",
  });
  const { client, patient } = useContext(FhirClientContext);

  useEffect(() => {
    const preloadQuestionnaireList = getEnvQuestionnaireList();
    if (!client || !patient) {
      dispatch({
        type: "ERROR",
        errorMessage: "No FHIR client or patient provided",
      });
      return;
    }
    if (state.complete) return;
    if (!isEmptyArray(preloadQuestionnaireList)) {
      console.log(
        "questionnaire list to load from environment variable ",
        preloadQuestionnaireList
      );
      dispatch({
        type: "LIST",
        questionnaireList: preloadQuestionnaireList,
      });
      return;
    }
    // load questionnaires based on questionnaire responses
    client
      .request(
        "QuestionnaireResponse?_sort=-_lastUpdated&_count=500&patient=" +
          patient.id
      )
      .then((results) => {
        const matchedResults =
          results && !isEmptyArray(results.entry)
            ? results.entry.filter(
                (item) =>
                  item.resource &&
                  item.resource.questionnaire &&
                  item.resource.questionnaire.split("/")[1]
              )
            : null;
        console.log(
          "matched results for questionnaire from QuestionnaireResponse ",
          matchedResults
        );
        if (isEmptyArray(matchedResults)) {
          dispatch({
            type: "ERROR",
            errorMessage: "No questionnaire list set",
          });
          return;
        }
        const qIds = matchedResults.map(
          (item) => item.resource.questionnaire.split("/")[1]
        );
        let uniqueQIds = [...new Set(qIds)];
        console.log(
          "questionnaire list from questionnaire responses to load ",
          uniqueQIds
        );
        dispatch({
          type: "LIST",
          questionnaireList: uniqueQIds,
          exactMatch: true,
        });
      })
      .catch((e) => {
        dispatch({
          type: "ERROR",
          errorMessage: e,
        });
      });
  }, [client, patient, state.complete]);

  return (
    <QuestionnaireListContext.Provider value={state}>
      <QuestionnaireListContext.Consumer>
        {({ questionnaireList, error }) => {
          // if client and patient are available render the children component(s)
          if (questionnaireList.length || error) {
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
