import { useContext, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { FhirClientContext } from "../context/FhirClientContext";
import { QuestionnaireListContext } from "../context/QuestionnaireListContext";
import {
  gatherSummaryDataByQuestionnaireId,
  getAppHeight,
  getFhirResourcesFromQueryResult,
  getFHIRResourcesToLoad,
  getFHIRResourcePaths,
  getSectionsToShow,
  shouldShowNav,
} from "../util/util";
import ErrorComponent from "./ErrorComponent";
import Section from "./Section";
import Version from "./Version";
import qConfig from "../config/questionnaire_config";
import { DEFAULT_DRAWER_WIDTH, MOBILE_DRAWER_WIDTH } from "../consts/consts";
import FloatingNavButton from "./FloatingNavButton";

export default function Summaries() {
  const { client, patient } = useContext(FhirClientContext);
  const { questionnaireList } = useContext(QuestionnaireListContext);
  const questionnareKeys =
    questionnaireList && questionnaireList.length
      ? questionnaireList.filter((o) => o.id).map((o) => o.id)
      : [];
  const sectionsToShow = getSectionsToShow();
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
    entry: [],
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

  const [loadedResources, dispatch] = useReducer(
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
              o.id,
              o.exactMatch
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
            }
          });
          setTimeout(
            () =>
              setSummaryData({
                data: summaries,
                loadComplete: true,
              }),
            150
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
    bundle.push({ resource: patient });
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

  const renderSections = () => {
    if (!sectionsToShow || !sectionsToShow.length)
      return <Alert severity="warning">No section to show.</Alert>;
    return sectionsToShow.map((section) => {
      return (
        <Section
          section={section}
          data={{
            patientBundle: patientBundle.current.entry,
            summaryData: summaryData,
            questionnaireList: questionnareKeys,
          }}
          key={`section_${section.id}`}
        ></Section>
      );
    });
  };

  const renderProgressIndicator = () => {
    const total = loadedResources?.length;
    const loaded = loadedResources?.filter(
      (resource) => resource.complete || resource.error
    ).length;
    if (total === 0) return false;
    return (
      <Box
        sx={{
          position: "fixed",
          width: "100%",
          height: "100%",
          backgroundColor: "#FFF",
          marginLeft: shouldShowNav()
            ? {
                md: -1 * parseInt(MOBILE_DRAWER_WIDTH) + "px",
                lg: -1 * parseInt(DEFAULT_DRAWER_WIDTH) + "px",
              }
            : "auto",
          marginRight: "auto",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          padding: (theme) => theme.spacing(4, 2),
        }}
      >
        <Stack
          sx={{
            marginTop: 1,
            marginBottom: 4,
            padding: 2,
          }}
          alignItems={{
            xs: "flex-start",
            sm: "center",
          }}
          justifyContent="center"
          direction="column"
          spacing={2}
        >
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ fontSize: "1.3rem", marginBottom: 1.25 }}
          >
            <div>Loading Data ...</div>
            <div>
              <b>{Math.ceil((loaded / total) * 100)} %</b>
            </div>
            <CircularProgress color="info"></CircularProgress>
          </Stack>
          <Stack direction="column" alignItems="flex-start" spacing={1}>
            {loadedResources.map((resource, index) => {
              const { title, name, id } = resource;
              const displayName = title || name || `Resource ${id}`;
              return (
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="flex-start"
                  key={`resource_${resource}_${index}`}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: (theme) =>
                        resource.error
                          ? theme.palette.error.main
                          : resource.complete
                          ? theme.palette.success.main
                          : theme.palette.warning.main,
                    }}
                  >
                    {String(displayName).toUpperCase()}
                  </Typography>
                  {resource.complete && resource.error && (
                    <CloseIcon color="error"></CloseIcon>
                  )}
                  {resource.complete && !resource.error && (
                    <CheckIcon color="success"></CheckIcon>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Stack>
      </Box>
    );
  };

  const renderError = () => {
    return (
      <Box sx={{ marginTop: 1 }}>
        <ErrorComponent message={error}></ErrorComponent>
      </Box>
    );
  };

  const mainStackStyleProps = {
    position: "relative",
    maxWidth: "1100px",
    minHeight: getAppHeight(),
    margin: "auto",
  };

  return (
    <Box className="app">
      {!isReady() && renderProgressIndicator()}
      {isReady() && (
        <>
          <FloatingNavButton></FloatingNavButton>
          <Stack className="summaries" sx={mainStackStyleProps}>
            <section>
              {error && renderError()}
              {!error && <>{renderSections()}</>}
            </section>
            <Version></Version>
          </Stack>
        </>
      )}
    </Box>
  );
}
