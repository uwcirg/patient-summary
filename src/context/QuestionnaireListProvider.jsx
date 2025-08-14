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
        console.log("WTF ", matchedResults);
        const hasPreloadQList = !isEmptyArray(preloadQuestionnaireList);
        if (!hasPreloadQList && isEmptyArray(matchedResults) && isEmptyArray(obResources)) {
          dispatch({
            type: "ERROR",
            errorMessage: "No questionnaire list set.",
          });
          return;
        }
        // let qIds = [];
        if (!isEmptyArray(obResources)) {
          console.log("o resources ", obResources);
          let obsLinkIds = obResources
            .filter((item) => getLinkIdByFromFlowsheetId(getFlowsheetId(item)))
            .map((item) => normalizeLinkId(getLinkIdByFromFlowsheetId(getFlowsheetId(item))));
          obsLinkIds = [...new Set(obsLinkIds)];
          console.log("oblinks ", obsLinkIds);
          if (!isEmptyArray(obsLinkIds)) {
            for (let config in questionnaireConfigs) {
              if (
                questionnaireConfigs[config].questionLinkIds?.find(
                  (linkId) => obsLinkIds.indexOf(normalizeLinkId(linkId)) !== -1,
                )
              ) {
                const builtQuestionnaire = buildQuestionnaire(questionnaireConfigs[config]);
                const builtQrs = observationsToQuestionnaireResponses(obResources, questionnaireConfigs[config]);
                console.log("builtQ ", builtQuestionnaire);
                console.log("builtQRs ", builtQrs);
                qAllResources = [...qAllResources, builtQuestionnaire];
                console.log("qAll? ", qAllResources)
                matchedResults = [...matchedResults, ...builtQrs];
                //   console.log("match ");
                //         console.log("built questionnaires ", buildQuestionnaire(questionnaireConfigs[config]));
                //   console.log("built qrs ", observationsToQuestionnaireResponses(obResources, questionnaireConfigs[config]))
                // }
              }
            }
          }
          // if (!isEmptyArray(obsLinkIds)) {
          //   console.log("linkIds ", obsLinkIds);
          //   for (let config in questionnaireConfigs) {
          //     if (config.questionLinkIds.find((linkId) => obsLinkIds.indexOf(normalizeLinkId(linkId)) !== -1)) {
          //       console.log("built questionnaires ", buildQuestionnaire(config));
          //       console.log("built qrs ", observationsToQuestionnaireResponses(obResources, config))
          //       // qAllResources = [...qAllResources, ...buildQuestionnaire(config)];
          //      // matchedResults = [...matchedResults, ...observationsToQuestionnaireResponses(obResources, config)];
          //     }
          //   }
          // }
        }
        dispatch({
          type: "QUESTIONNAIRE_RESPONSE_LOADED",
        });
        // qIds = [...qIds, ...matchedResults.map((item) => item.questionnaire.split("/")[1])];
        console.log("matched results ", matchedResults);
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
              questionnaires: [...qAllResources, ...getFhirResourcesFromQueryResult(qResources)],
              questionnaireResponses: getFhirResourcesFromQueryResult(matchedResults),
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
