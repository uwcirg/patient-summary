import React, { useContext, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import CheckIcon from "@mui/icons-material/Check";
import CircularProgress from "@mui/material/CircularProgress";
import { Typography } from "@mui/material";
import {
  getFHIRResourcePath,
  getFhirResourcesFromQueryResult,
  getFlowsheetId,
  getFlowsheetIds,
  getLinkIdByFromFlowsheetId,
  normalizeLinkId,
  processPage,
} from "@util/fhirUtil";
import { getEnvQuestionnaireList, getEnv, isEmptyArray } from "@util";
import questionnaireConfigs from "@config/questionnaire_config";
import { buildQuestionnaire, observationsToQuestionnaireResponses } from "@models/resultBuilders/helpers";
import QuestionnaireScoringBuilder from "@models/resultBuilders/QuestionnaireScoringBuilder";
import { QuestionnaireListContext } from "./QuestionnaireListContext";
import { FhirClientContext } from "./FhirClientContext";
import { NO_CACHE_HEADER } from "@/consts";

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
          summaries: action.summaries,
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
  const [state, dispatch] = useReducer(resourceReducer, {
    questionnaireList: [],
    questionnaires: [],
    questionnaireResponses: [],
    exactMatchById: isFromEpic,
    loadedStatus: {
      questionnaire: false,
      questionnaireResponse: false,
    },
    summaries: {},
    complete: false,
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
    let obResources = [];
    let qAllResources = [];
    // load questionnaires based on questionnaire responses
    Promise.allSettled([
      client.request(
        {
          url: "QuestionnaireResponse?_count=200&patient=" + patient.id,
          header: NO_CACHE_HEADER,
        },
        {
          pageLimit: 0, // unlimited pages
          onPage: processPage(client, qrResources),
        },
      ),
      client.request(
        {
          url: "Observation?_count=200&patient=" + patient.id + "&code=" + getFlowsheetIds().join(","),
          header: NO_CACHE_HEADER,
        },
        {
          pageLimit: 0, // unlimited pages
          onPage: processPage(client, obResources),
        },
      ),
    ])
      .then(() => {
        let matchedResults = !isEmptyArray(qrResources)
          ? qrResources.filter((item) => item && item.questionnaire && item.questionnaire.split("/")[1])
          : [];
        const hasPreloadQList = !isEmptyArray(preloadQuestionnaireList);
        if (!hasPreloadQList && isEmptyArray(matchedResults) && isEmptyArray(obResources)) {
          dispatch({
            type: "ERROR",
            errorMessage: "No questionnaire list set.",
          });
          return;
        }
        let qIds = [...preloadQuestionnaireList];
        let builtQuestionnaires = [];
        let builtQuestionnaireResponses = [];
        if (!isEmptyArray(obResources)) {
          let obsLinkIds = obResources
            .filter((item) => getLinkIdByFromFlowsheetId(getFlowsheetId(item)))
            .map((item) => normalizeLinkId(getLinkIdByFromFlowsheetId(getFlowsheetId(item))));
          obsLinkIds = [...new Set(obsLinkIds)];
          if (!isEmptyArray(obsLinkIds)) {
            for (let config in questionnaireConfigs) {
              if (
                questionnaireConfigs[config].questionLinkIds?.find(
                  (linkId) => obsLinkIds.indexOf(normalizeLinkId(linkId)) !== -1,
                )
              ) {
                if (questionnaireConfigs[config]) {
                  builtQuestionnaires = [...builtQuestionnaires, buildQuestionnaire(questionnaireConfigs[config])];
                  builtQuestionnaireResponses = [
                    ...builtQuestionnaireResponses,
                    ...observationsToQuestionnaireResponses(obResources, questionnaireConfigs[config]),
                  ];
                } else qIds = [...qIds, config.questionnaireId];
                console.log("built questionnaire ", builtQuestionnaires);
                console.log("built Qrs ", builtQuestionnaireResponses);
              }
            }
          }
        }
        dispatch({
          type: "QUESTIONNAIRE_RESPONSE_LOADED",
        });
        qIds = [...qIds, ...(matchedResults?.map((item) => item.questionnaire?.split("/")[1]) ?? [])];
        let uniqueQIds = [...new Set(qIds)];
        qAllResources = builtQuestionnaires;
        matchedResults = [...matchedResults, ...builtQuestionnaireResponses];
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
            const questionnaireResources = [...getFhirResourcesFromQueryResult([...qAllResources, ...qResources])];
            const questionnaireResponseResources = getFhirResourcesFromQueryResult(matchedResults);
            const summaries = new QuestionnaireScoringBuilder({}, [
              ...questionnaireResources,
              ...questionnaireResponseResources,
            ]).summariesByQuestionnaireFromBundle();
            dispatch({
              type: "RESULTS",
              questionnaireList: [...qListToLoad, ...builtQuestionnaires.map((q) => q.id)],
              questionnaires: questionnaireResources,
              questionnaireResponses: questionnaireResponseResources,
              summaries: summaries,
              exactMatchById: !hasPreloadQList,
              complete: true,
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
        console.log("Error in retrieving results in questionnaire provider ? ", e);
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
          <Typography variant="body1">Loading ...</Typography>
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
