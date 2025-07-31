import React, { useContext, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import CheckIcon from "@mui/icons-material/Check";
import CircularProgress from "@mui/material/CircularProgress";
import { NO_CACHE_HEADER } from "../consts";
import {
  getFHIRResourcePath,
  getFHIRResourceTypesToLoad,
  getFhirResourcesFromQueryResult,
  processPage,
} from "../util/fhirUtil";
import { getEnvQuestionnaireList, getEnv, isEmptyArray } from "../util";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "./FhirClientContext";

export default function QuestionnaireListProvider({ children }) {
  const isFromEpic = String(getEnv("REACT_APP_EPIC_QUERIES")) === "true";
  // hook for tracking state
  const resourceReducer = (state, action) => {
    switch (action.type) {
      case "QUESTIONNAIRE_LOADED":
        return {
          ...state,
          loadedStatus: {
            ...state.loadedStatus,
            questionnaire: true,
          },
        };
      case "QUESTIONNAIRE_RESPONSE_LOADED":
        return {
          ...state,
          loadedStatus: {
            ...state.loadedStatus,
            questionnaireResponse: true,
          },
        };
      case "RESULTS":
        return {
          ...state,
          questionnaireList: action.questionnaireList,
          questionnaireResponses: action.questionnaireResponses,
          questionnaires: action.questionnaires,
          exactMatchById: !!action.exactMatchById,
          loadedStatus: {
            questionnaire: false,
            questionnaireResponse: true,
          },
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
  const { client, patient } = useContext(FhirClientContext);
  const resourceTypesToBeLoaded = getFHIRResourceTypesToLoad();
  const notConfigured = resourceTypesToBeLoaded.indexOf("Questionnaire") === -1;
  const [state, dispatch] = useReducer(resourceReducer, {
    questionnaireList: [],
    questionnaires: [],
    questionnaireResponses: [],
    exactMatchById: isFromEpic,
    loadedStatus: {
      questionnaire: false,
      questionnaireResponse: false,
    },
    complete: notConfigured,
    error: false,
    errorMessage: "",
  });
  useEffect(() => {
    if (!client || !patient) {
      dispatch({
        type: "ERROR",
        errorMessage: "No FHIR client or patient provided",
      });
      return;
    }
    if (state.complete) return;

    const preloadQuestionnaireList = getEnvQuestionnaireList();
    let qrResources = [];
    let qResources = [];
    // load questionnaires based on questionnaire responses
    client
      .request(
        {
          url: "QuestionnaireResponse?_count=200&patient=" + patient.id,
          header: NO_CACHE_HEADER,
        },
        {
          pageLimit: 0, // unlimited pages
          onPage: processPage(client, qrResources),
        },
      )
      .then(() => {
        const matchedResults = !isEmptyArray(qrResources)
          ? qrResources.filter((item) => item && item.questionnaire && item.questionnaire.split("/")[1])
          : null;
        const hasPreloadQList = !isEmptyArray(preloadQuestionnaireList);
        if (!hasPreloadQList && isEmptyArray(matchedResults)) {
          dispatch({
            type: "ERROR",
            errorMessage: "No questionnaire list set.",
          });
          return;
        }
        dispatch({
          type: "QUESTIONNAIRE_RESPONSE_LOADED",
        });
        const qIds = matchedResults.map((item) => item.questionnaire.split("/")[1]);
        let uniqueQIds = [...new Set(qIds)];
        const qListToLoad = hasPreloadQList ? preloadQuestionnaireList : uniqueQIds;
        const questionnaireResourcePath = getFHIRResourcePath(patient.id, ["Questionnaire"], {
          questionnaireList: qListToLoad,
          exactMatchById: !hasPreloadQList,
        });
        client
          .request(
            { url: questionnaireResourcePath, header: NO_CACHE_HEADER },
            {
              pageLimit: 0, // unlimited pages
              onPage: processPage(client, qResources),
            },
          )
          .then(() => {
            dispatch({
              type: "RESULTS",
              questionnaireList: qListToLoad,
              questionnaires: getFhirResourcesFromQueryResult(qResources),
              questionnaireResponses: getFhirResourcesFromQueryResult(matchedResults),
              exactMatchById: true,
              complete: true
            });
          })
          .catch((e) => {
            dispatch({
              type: "ERROR",
              errorMessage: e,
            });
          });
      })
      .catch((e) => {
        dispatch({
          type: "ERROR",
          errorMessage: e,
        });
      });
  }, [client, patient, state.complete]);

  const renderLoading = () => {
    const questionnaireLoaded = state.loadedStatus["questionnaire"];
    const questionnaireResponseLoaded = state.loadedStatus["questionnaireResponse"];
    return (
      <Stack
        spacing={2}
        direction="row"
        style={{ marginTop: "56px", padding: "24px" }}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <CircularProgress></CircularProgress>
        <Stack direction="column" spacing={1} justifyContent="center">
          <div>Loading first ...</div>
          <Stack
            className={questionnaireLoaded ? "text-success" : "text-warning"}
            direction={"row"}
            spacing={1}
            alignItems={"center"}
          >
            <span>QUESTIONNAIRES</span>
            {questionnaireLoaded && <CheckIcon color="success"></CheckIcon>}
          </Stack>
          <Stack
            className={state.loadedStatus["questionnaireResponse"] ? "text-success" : "text-warning"}
            direction={"row"}
            spacing={1}
            alignItems={"center"}
          >
            <span>QUESTIONNAIRE RESPONSES </span>
            {questionnaireResponseLoaded && <CheckIcon color="success"></CheckIcon>}
          </Stack>
        </Stack>
      </Stack>
    );
  };

  return (
    <QuestionnaireListContext.Provider value={state}>
      <QuestionnaireListContext.Consumer>
        {({ complete, error }) => {
          // if client and patient are available render the children component(s)
          if (complete || error) {
            return children;
          }
          // loading
          return renderLoading();
        }}
      </QuestionnaireListContext.Consumer>
    </QuestionnaireListContext.Provider>
  );
}

QuestionnaireListProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
