import { useContext, useReducer, useState, useRef } from "react";
import { useQuery } from "react-query";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { FhirClientContext } from "../context/FhirClientContext";
import {
  gatherSummaryDataByQuestionnaireId,
  getAppHeight,
  getFhirResourcesFromQueryResult,
  getFHIRResourcesToLoad,
  getFHIRResourcePaths,
  getQuestionnaireList,
  getSectionsToShow,
  shouldShowNav,
} from "../util/util";
import ErrorComponent from "./ErrorComponent";
import ScoringSummary from "./ScoringSummary";
import Version from "./Version";
import qConfig from "../config/questionnaire_config";
import {
  DEFAULT_DRAWER_WIDTH,
  MOBILE_DRAWER_WIDTH,
  DEFAULT_ACCORDION_HEADER_HEIGHT,
} from "../consts/consts";
import FloatingNavButton from "./FloatingNavButton";

export default function Summaries() {
  const theme = useTheme();
  const { client, patient } = useContext(FhirClientContext);
  const questionnaireList = getQuestionnaireList();
  const sectionsToShow = getSectionsToShow();
  const [summaryData, setSummaryData] = useState({
    data: questionnaireList.map((qid) => {
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
    ...questionnaireList.map((qid) => ({
      id: qid,
      title: qConfig[qid] ? qConfig[qid].shortTitle : "",
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
        const requests = questionnaireList.map((qid) =>
          (async () => {
            let error = "";
            let results = await gatherSummaryDataByQuestionnaireId(
              client,
              patientBundle.current,
              qid
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
      const sectionId = section.id.toLowerCase();
      return (
        <Box
          key={"accordion_wrapper_" + sectionId}
          className="accordion-wrapper"
          sx={{
            marginBottom: theme.spacing(1),
          }}
        >
          <Box
            id={section.anchorElementId}
            key={section.anchorElementId}
            sx={{
              position: "relative",
              top: -1 * parseInt(DEFAULT_ACCORDION_HEADER_HEIGHT),
              height: "1px",
              width: "1px",
            }}
          ></Box>
          <Accordion
            key={`section_${sectionId}`}
            disableGutters={true}
            defaultExpanded={
              section.hasOwnProperty("expanded") ? section.expanded : true
            }
            sx={{
              "& .MuiAccordionSummary-content": {
                margin: 0,
              },
              "& .MuiPaper-root": {
                borderRadius: 0,
              },
            }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon
                  sx={{ color: "#FFF" }}
                  className="print-hidden"
                />
              }
              aria-controls="panel1a-content"
              id={`accordion_${sectionId}`}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: "#FFF",
                borderBottom: "1px solid #FFF",
              }}
            >
              <Stack
                spacing={1}
                direction={"row"}
                justifyContent={"center"}
                alignItems={"center"}
              >
                {section.icon({ color: "#FFF" })}
                <Typography
                  variant="h6"
                  component="h2"
                  id={`${sectionId}_title`}
                >
                  {section.title}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: theme.spacing(1, 2) }}>
              {section.component &&
                section.component({
                  patientBundle: patientBundle.current.entry,
                  summaryData: summaryData,
                  questionnaireList: questionnaireList,
                })}
              {!section.component && (
                <ErrorComponent message="no section component to render"></ErrorComponent>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
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
              const displayName = resource.title ? resource.title : resource.id;
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

  const renderScoringSummary = () => {
    return (
      <ScoringSummary
        list={getQuestionnaireList()}
        summaryData={summaryData.data}
      ></ScoringSummary>
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
              {!error && (
                <>
                  {renderScoringSummary()}
                  {renderSections()}
                </>
              )}
            </section>
            <Version></Version>
          </Stack>
        </>
      )}
    </Box>
  );
}
