import {
  createRef,
  forwardRef,
  memo,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import { useQuery } from "react-query";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { FhirClientContext } from "../context/FhirClientContext";
import {
  gatherSummaryDataByQuestionnaireId,
  getFhirResourcesFromQueryResult,
  getFHIRResourcePaths,
  getQuestionnaireList,
  getSectionsToShow,
  isInViewport,
} from "../util/util";
import ErrorComponent from "./ErrorComponent";
import MedicalHistory from "./MedicalHistory";
import PatientInfo from "./PatientInfo";
import QuestionnaireSelector from "./QuestionnaireSelector";
import ScoringSummary from "./ScoringSummary";
import Summary from "./Summary";
import Version from "./Version";
import { Typography } from "@mui/material";
import {
  DEFAULT_DRAWER_WIDTH,
  MOBILE_DRAWER_WIDTH,
  DEFAULT_TOOLBAR_HEIGHT,
  MOBILE_TOOLBAR_HEIGHT,
} from "../consts/consts";
let scrollIntervalId = 0;

export default function Summaries() {
  const theme = useTheme();
  const { client, patient } = useContext(FhirClientContext);
  const fabRef = createRef();
  const anchorRef = createRef();
  const selectorRef = createRef();
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
  const [percentLoaded, setPercentLoaded] = useState(0);

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
          onErrorCallback("No configured questionnaire id(s) found.");
          return;
        }
        if (summaryData.loadComplete) return;
        let count = 0;
        console.log("patient bundle ", patientBundle.current);
        const requests = questionnaireList.map((qid) =>
          (async () => {
            let error = "";
            let results = await gatherSummaryDataByQuestionnaireId(
              client,
              patientBundle.current,
              qid
            ).catch((e) => (error = e));
            count = count + 1;
            setPercentLoaded(
              parseInt((count / questionnaireList.length) * 100)
            );
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

  const BoxRef = forwardRef((props, ref) => (
    <Box {...props} ref={ref}>
      {props.children}
    </Box>
  ));
  const FabRef = forwardRef((props, ref) => (
    <Fab ref={ref} {...props}>
      {props.children}
    </Fab>
  ));
  const handleFab = useCallback(() => {
    const selectorElement = selectorRef.current;
    const fabElement = fabRef.current;
    if (!fabElement || !selectorElement) return;
    clearInterval(scrollIntervalId);
    scrollIntervalId = setInterval(() => {
      if (isInViewport(selectorElement)) {
        fabElement.classList.remove("flex");
        fabElement.classList.add("hide");
        return;
      }
      fabElement.classList.add("flex");
      fabElement.classList.remove("hide");
    }, 150);
  }, [fabRef, selectorRef]);

  const isReady = () => summaryData.loadComplete || error;

  const getFhirResources = async () => {
    if (!client || !patient || !patient.id)
      throw new Error("Client or patient missing.");
    const paths = getFHIRResourcePaths(patient.id);
    const requests = paths.map((path) => client.request(path));
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

  const renderNavButton = () => (
    <FabRef
      className={"hide"}
      ref={fabRef}
      color="primary"
      aria-label="add"
      size="small"
      sx={{
        position: "fixed",
        bottom: "8px",
        right: "24px",
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!anchorRef.current) return;
        anchorRef.current.scrollIntoView();
      }}
      title="Back to Top"
    >
      <ArrowUpwardIcon aria-label="Back to Top" />
    </FabRef>
  );

  const renderSections = () => {
    if (!sectionsToShow)
      return <Alert severity="warning">No section to show</Alert>;
    return sectionsToShow.map((section) => {
      const sectionId = section.id.toLowerCase();
      return (
        <Accordion
          key={`section_${section.id}`}
          id={`section_${section.id}`}
          disableGutters={true}
          defaultExpanded={
            section.hasOwnProperty("expanded") ? section.expanded : true
          }
        >
          <Box
            id={`anchor_${section.id}`}
            sx={{
              position: "relative",
              top: -1 * parseInt(DEFAULT_TOOLBAR_HEIGHT),
              height: "1px",
              width: "1px",
            }}
          ></Box>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#FFF" }} />}
            aria-controls="panel1a-content"
            id={`accordion_${section.id}`}
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: "#FFF",
              borderBottom: "1px solid #FFF",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              {section.icon({ color: "#FFF" })}
              <Typography variant="h6" component="h2" id={section.id}>
                {section.title}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: 2 }}>
            {sectionId === "medicalhistory" && renderMedicalHistory()}
            {sectionId === "responses" && renderSummaries()}
          </AccordionDetails>
        </Accordion>
      );
    });
  };

  const renderAnchorTop = () => (
    <BoxRef
      ref={anchorRef}
      sx={{
        position: "relative",
        top: -1 * parseInt(DEFAULT_TOOLBAR_HEIGHT) + "px",
        height: "2px",
        width: "2px",
      }}
    ></BoxRef>
  );

  const renderSummaries = () => {
    return questionnaireList.map((questionnaireId, index) => {
      const dataObject =
        summaryData.data && summaryData.data[questionnaireId]
          ? summaryData.data[questionnaireId]
          : null;
      if (!dataObject)
        return (
          <Stack
            alignItems={"center"}
            direction="row"
            justifyContent={"flex-start"}
            spacing={2}
            sx={{ marginTop: 2 }}
            key={`summary_loader_${index}`}
          >
            <Typography
              variant="h6"
              component="h3"
              color="accent"
              sx={{ marginBottom: 2, minWidth: "120px" }}
            >
              {questionnaireId.toUpperCase()}
            </Typography>
            <LinearProgress
              sx={{ width: "300px", marginTop: 6 }}
            ></LinearProgress>
          </Stack>
        );
      return (
        <Box key={`summary_container_${index}`}>
          <Summary
            questionnaireId={questionnaireId}
            data={summaryData.data[questionnaireId]}
            key={`questionnaire_summary_${index}`}
          ></Summary>
          {index !== questionnaireList.length - 1 && (
            <Divider
              key={`questionnaire_divider_${index}`}
              sx={{ borderWidth: "2px", marginBottom: 2 }}
              light
            ></Divider>
          )}
        </Box>
      );
    });
  };

  const renderQuestionnaireSelector = () => {
    return (
      <BoxRef
        ref={selectorRef}
        style={{
          opacity: isReady() ? 1 : 0.4,
          width: "100%",
          alignSelf: "stretch",
          border: "2px solid #ececec",
          backgroundColor: "#FFF",
        }}
      >
        <QuestionnaireSelector list={questionnaireList}></QuestionnaireSelector>
      </BoxRef>
    );
  };

  const renderMedicalHistory = () => {
    const conditions = patientBundle.current.entry
      .filter((item) => {
        return item.resource && item.resource.resourceType === "Condition";
      })
      .map((item) => item.resource);
    if (!conditions.length)
      return <Alert severity="warning">No recorded condition.</Alert>;
    return <MedicalHistory data={conditions}></MedicalHistory>;
  };

  const MemoizedQuestionnaireSelector = memo(renderQuestionnaireSelector);

  const renderProgressIndicator = () => {
    return (
      <Box
        sx={{
          position: "fixed",
          top: MOBILE_TOOLBAR_HEIGHT,
          [theme.breakpoints.up("sm")]: {
            top: DEFAULT_TOOLBAR_HEIGHT,
          },
          width: "100%",
          height: "100%",
          backgroundColor: "#FFF",
          marginLeft: {
            md: -1 * parseInt(MOBILE_DRAWER_WIDTH) + "px",
            lg: -1 * parseInt(DEFAULT_DRAWER_WIDTH) + "px",
          },
          zIndex: (theme) => theme.zIndex.drawer + 1,
          padding: 2,
        }}
      >
        <Stack
          sx={{
            marginTop: 2,
            marginBottom: 4,
            padding: 2,
          }}
          alignItems="center"
          justifyContent="flex-start"
          direction="row"
          spacing={2}
        >
          <Box>
            Loading Data. This may take a while... <b>{percentLoaded + " %"}</b>
          </Box>
          <CircularProgress></CircularProgress>
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

  useEffect(() => {
    window.addEventListener("scroll", handleFab);
    return () => {
      clearInterval(scrollIntervalId);
      window.removeEventListener("scroll", handleFab, false);
    };
  }, [handleFab]);

  return (
    <Box className="app" sx={{ minHeight: `calc(100vh - ${DEFAULT_TOOLBAR_HEIGHT}px)` }}>
      {!isReady() && renderProgressIndicator()}
      {isReady() && (
        <>
          {renderAnchorTop()}
          {renderNavButton()}
          <Stack
            className="summaries"
            sx={{
              position: "relative",
              maxWidth: "1100px",
              margin: "auto",
            }}
          >
            <section>
              <PatientInfo patient={patient}></PatientInfo>
              {error && (
                <Box sx={{ marginTop: 1 }}>
                  <ErrorComponent message={error}></ErrorComponent>
                </Box>
              )}
              {!error && (
                <>
                  <>
                    <Stack
                      direction={{ xs: "column", sm: "column", md: "row" }}
                      spacing={2}
                      sx={{
                        marginTop: 2,
                        marginBottom: 3,
                        backgroundColor: (theme) => theme.palette.background.main,
                        padding: 2,
                      }}
                    >
                      <MemoizedQuestionnaireSelector></MemoizedQuestionnaireSelector>
                      {renderScoringSummary()}
                    </Stack>
                    {renderSections()}
                  </>
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
