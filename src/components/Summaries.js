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
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { FhirClientContext } from "../context/FhirClientContext";
import {
  gatherSummaryDataByQuestionnaireId,
  getFhirResourcesFromQueryResult,
  getFHIRResourcePaths,
  getQuestionnaireList,
  isInViewport,
} from "../util/util";
import ErrorComponent from "./ErrorComponent";
import PatientInfo from "./PatientInfo";
import QuestionnaireSelector from "./QuestionnaireSelector";
import ScoringSummary from "./ScoringSummary";
import Summary from "./Summary";
import Version from "./Version";
import { Typography } from "@mui/material";
let scrollIntervalId = 0;

export default function Summaries() {
  const { client, patient } = useContext(FhirClientContext);
  const fabRef = createRef();
  const anchorRef = createRef();
  const selectorRef = createRef();
  const questionnaireList = getQuestionnaireList();
  const [summaryData, setSummaryData] = useState({
    data: null,
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
          setError("No configured questionnaire id(s) found.");
        }
        console.log("patient bundle ", patientBundle.current.entry);
        const requests = questionnaireList.map((qid) =>
          (async () => {
            let error = "";
            let results = await gatherSummaryDataByQuestionnaireId(
              client,
              patientBundle.current,
              qid
            ).catch((e) => (error = e));
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
          console.log("all settled results ", results);
          if (results && results.length > 0) {
            let summaries = {};
            results.forEach((result) => {
              const o = Object.entries(result.value)[0];
              const key = o[0];
              if (summaryData[key]) return true;
              summaries[key] = o[1];
            });
            setSummaryData({
              data: summaries,
              loadComplete: true,
            });
            console.log("summaries ", summaryData);
          }
        });
      },
      onError: (e) => {
        setError("Error fetching FHIR resources. See console for detail.");
        console.log("FHIR resources fetching error: ", e);
      },
    }
  );

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

  const handleCallback = (obj) => {
    if (isReady()) return;
    if (obj && obj.status === "error") setError(true);
  };
  const isReady = () => patientBundle.current.loadComplete || error;

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
      sx={{ position: "fixed", bottom: "24px", right: "24px" }}
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

  const renderAncor = () => (
    <BoxRef
      ref={anchorRef}
      sx={{
        position: "relative",
        top: "-64px",
        height: "2px",
        width: "2px",
      }}
    ></BoxRef>
  );

  const renderSummaries = () => {
    return questionnaireList.map((questionnaireId, index) => {
      if (!summaryData["data"] || !summaryData["data"][questionnaireId])
        return (
          <Stack
            alignItems={"center"}
            direction="row"
            justifyContent={"space-between"}
            spacing={2}
            sx={{marginTop: 2}}
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
              sx={{ width: "300px", marginTop: 6, flex: 1 }}
            ></LinearProgress>
          </Stack>
        );
      return (
        <Box key={`summary_container_${index}`}>
          <Summary
            questionnaireId={questionnaireId}
            patientBundle={patientBundle.current}
            data={summaryData["data"][questionnaireId]}
            key={`questionnaire_summary_${index}`}
            callbackFunc={handleCallback}
          ></Summary>
          {index !== questionnaireList.length - 1 && (
            <Divider key={`questionnaire_divider_${index}`} light></Divider>
          )}
        </Box>
      );
    });
  };

  const renderQuestionnaireSelector = () => {
    if (!summaryData.loadComplete) return null;
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

  const MemoizedQuestionnaireSelector = memo(renderQuestionnaireSelector);

  const renderScoringSummary = () => {
    // const responses = patientBundle.current.entry.filter(
    //   (entry) => entry.resource.resourceType === "QuestionnaireResponse"
    // );
    if (!summaryData.loadComplete || !summaryData.data) return null;
    return (
      <ScoringSummary
        list={getQuestionnaireList()}
        summaryData={summaryData.data}
        loadComplete={summaryData.loadComplete}
      ></ScoringSummary>
    );
  };

  const renderLoadingIndicator = () => (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        marginTop: 8,
      }}
    >
      <CircularProgress
        sx={{ position: "absolute", top: 16, left: 16 }}
      ></CircularProgress>
    </Box>
  );

  useEffect(() => {
    window.addEventListener("scroll", handleFab);
    return () => {
      clearInterval(scrollIntervalId);
      window.removeEventListener("scroll", handleFab, false);
    };
  }, [handleFab]);


  return (
    <main className="app">
      {!isReady() && renderLoadingIndicator()}
      {isReady() && (
        <>
          {renderAncor()}
          {renderNavButton()}
        </>
      )}
      {isReady() && (
        <Stack
          className="summaries"
          sx={{
            position: "relative",
            maxWidth: "1120px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <section>
            <PatientInfo></PatientInfo>
            {error && (
              <Box sx={{ marginTop: 1 }}>
                <ErrorComponent message={error}></ErrorComponent>
              </Box>
            )}
            {summaryData.loadComplete && (
              <>
                <Stack
                  direction={{ xs: "column", sm: "column", md: "row" }}
                  spacing={2}
                  sx={{
                    marginTop: 2,
                    marginBottom: 4,
                    backgroundColor: "#f3f3f4",
                    padding: 2,
                  }}
                >
                  <MemoizedQuestionnaireSelector></MemoizedQuestionnaireSelector>
                  {renderScoringSummary()}
                </Stack>
              </>
            )}
            <Divider></Divider>
            {renderSummaries()}
          </section>
          <Version></Version>
        </Stack>
      )}
    </main>
  );
}
