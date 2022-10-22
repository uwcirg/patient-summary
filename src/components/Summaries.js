import {
  createRef,
  forwardRef,
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
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { FhirClientContext } from "../context/FhirClientContext";
import {
  getFhirResourcesFromQueryResult,
  getFHIRResourcePaths,
  getQuestionnaireList,
  isInViewport,
} from "../util/util";
import QuestionnaireSelector from "./QuestionnaireSelector";
import ScoringSummary from "./ScoringSummary";
import Summary from "./Summary";
import Version from "./Version";
let scrollIntervalId = 0;

export default function Summaries() {
  const { client, patient } = useContext(FhirClientContext);
  const fabRef = createRef();
  const anchorRef = createRef();
  const selectorRef = createRef();
  const questionnaireList = getQuestionnaireList();
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [],
    loadComplete: false,
  });
  const [error, setError] = useState(null);

  const { isSuccess, isError } = useQuery(
    "fhirResources",
    async () => {
      const results = await getFhirResources();
      return results;
    },
    {
      disabled: error,
      refetchOnWindowFocus: false,
      staleTime: 0,
      onSettled: (fhirData) => {
        patientBundle.current = {
          ...patientBundle.current,
          entry: [...patientBundle.current.entry, ...fhirData],
          loadComplete: true,
        };
        console.log("patient bundle ", patientBundle.current.entry)
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
  const isReady = () => isSuccess || isError;

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
      return (
        <Box key={`summary_container_${index}`}>
          <Summary
            questionnaireId={questionnaireId}
            patientBundle={patientBundle.current}
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
    return (
      <BoxRef
        ref={selectorRef}
        style={{
          opacity: isReady() ? 1 : 0.4,
          width: "100%",
          alignSelf: "stretch",
          border: "2px solid #ececec",
          backgroundColor: "#FFF"
        }}
      >
       <QuestionnaireSelector
          list={questionnaireList}
        ></QuestionnaireSelector>
      </BoxRef>
    );
  };

 // const MemoizedQuestionnaireSelector = memo(renderQuestionnaireSelector);

  const renderScoringSummary = () => (
    <ScoringSummary
      list={getQuestionnaireList()}
      responses={patientBundle.current.entry.filter(
        (entry) => entry.resource.resourceType === "QuestionnaireResponse"
      )}
    ></ScoringSummary>
  );

  const renderLoadingIndicator = () => (
    <Box sx={{ position: "absolute", top: 16, left: 16 }}>
      <CircularProgress></CircularProgress>
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
    <>
      {isReady() && (
        <>
          {renderAncor()}
          {renderNavButton()}
        </>
      )}
      <Stack className="summaries" sx={{ position: "relative" }}>
        {!isReady() && renderLoadingIndicator()}
        {isReady() && (
          <section>
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
              {renderQuestionnaireSelector()}
              {renderScoringSummary()}
            </Stack>
            <Divider></Divider>
            {renderSummaries()}
          </section>
        )}
        {isReady() && <Version></Version>}
      </Stack>
    </>
  );
}
