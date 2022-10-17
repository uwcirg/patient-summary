import {
  createRef,
  forwardRef,
  useContext,
  useEffect,
  useCallback,
  useState,
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
  getFHIRResourcePaths,
  getQuestionnaireList,
  isInViewport,
} from "../util/util";
import QuestionnaireSelector from "./QuestionnaireSelector";
import Summary from "./Summary";
import Version from "./Version";
let scrollIntervalId = 0;

export default function Summaries() {
  const { client, patient } = useContext(FhirClientContext);
  const fabRef = createRef();
  const anchorRef = createRef();
  const selectorRef = createRef();
  const questionnaireList = getQuestionnaireList();
  const [patientBundle, setPatientBundle] = useState({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [],
    loadComplete: false,
  });
  const [error, setError] = useState(null);

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
  const isReady = useCallback(
    () => patientBundle.loadComplete || error,
    [patientBundle.loadComplete, error]
  );

  const getFhirResources = async () => {
    if (!client || !patient || !patient.id)
      throw new Error("Client or patient missing.");
    const resources = getFHIRResourcePaths(patient.id);
    const requests = resources.map((resource) => client.request(resource));
    if (!requests) {
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
          if (result.resourceType === "Bundle" && result.entry) {
            result.entry.forEach((o) => {
              if (o && o.resource) bundle.push({ resource: o.resource });
            });
          } else if (Array.isArray(result)) {
            result.forEach((o) => {
              if (o.resourceType) bundle.push({ resource: o });
            });
          } else {
            bundle.push({ resource: result });
          }
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
            patientBundle={patientBundle}
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
    if (questionnaireList.length === 1) return <div></div>;
    return (
      <BoxRef
        ref={selectorRef}
        style={{
          opacity: isReady() ? 1 : 0.4,
          borderBottom: 1,
          borderColor: "#ececec",
          borderBottomStyle: "solid",
          paddingBottom: "32px",
          marginBottom: "8px",
        }}
      >
        <QuestionnaireSelector
          title="Go to Questionnaire"
          list={questionnaireList}
        ></QuestionnaireSelector>
      </BoxRef>
    );
  };

  const renderLoadingIndicator = () => (
    <Box sx={{ position: "absolute", top: 16, left: 16 }}>
      <CircularProgress></CircularProgress>
    </Box>
  );

  const fhirQueryResults = useQuery("fhirResources", getFhirResources);

  useEffect(() => {
    
    if (isReady()) return;
    
    const status = fhirQueryResults.status;
    const fhirData = fhirQueryResults.data;

    if (status === "error") setError("Error fetching FHIR resources");
    if (status === "success") {
      setPatientBundle((prevPatientBundle) => {
        return {
          ...prevPatientBundle,
          entry: [...prevPatientBundle.entry, ...fhirData],
          loadComplete: true,
        };
      });
    }
  }, [isReady, fhirQueryResults]);

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
            {renderQuestionnaireSelector()}
            {renderSummaries()}
          </section>
        )}
        {isReady() && <Version></Version>}
      </Stack>
    </>
  );
}
