import { lazy, Suspense } from "react";
import BallotIcon from "@mui/icons-material/Ballot";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SummarizeIcon from "@mui/icons-material/Summarize";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { getResourcesByResourceType } from "../util/util";

const renderLoader = () => (
  <Stack
    direction="row"
    spacing={2}
    alignItems="center"
    sx={{
      marginTop: (theme) => theme.spacing(1),
      marginBottom: (theme) => theme.spacing(1),
    }}
  >
    <Box color="primary">Retrieving content ...</Box>
    <CircularProgress color="primary" size={24}></CircularProgress>
  </Stack>
);

const renderScoringSummary = (props) => {
  const summaryData = props.summaryData || {};
  const questionnaireList = props.questionnaireList || [];
  const ScoreSummary = lazy(() =>
    import("../components/sections/ScoringSummary")
  );
  return (
    <Suspense fallback={renderLoader()}>
      <ScoreSummary
        summaryData={summaryData.data}
        questionnaireList={questionnaireList}
      ></ScoreSummary>
    </Suspense>
  );
};

const renderMedicalHistory = (props) => {
  const MedicalHistory = lazy(() =>
    import("../components/sections/MedicalHistory")
  );
  return (
    <Suspense fallback={renderLoader()}>
      <MedicalHistory
        data={getResourcesByResourceType(props.patientBundle, "Condition")}
      ></MedicalHistory>
    </Suspense>
  );
};
const renderObservations = (props) => {
  const Procedure = lazy(() =>
    import("../components/sections/Observations")
  );
  return (
    <Suspense fallback={renderLoader()}>
      <Procedure
        data={getResourcesByResourceType(props.patientBundle, "Observation")}
      ></Procedure>
    </Suspense>
  );
};
const renderSummaries = ({ questionnaireKeys, summaryData }) => {
  const Summaries = lazy(() => import("../components/sections/Summaries"));
  return (
    <Suspense fallback={renderLoader()}>
      {
        <Summaries
          questionnaireKeys={questionnaireKeys}
          summaryData={summaryData}
        ></Summaries>
      }
    </Suspense>
  );
};

const DEFAULT_SECTIONS = [
  {
    id: "scoreSummary",
    title: "Score Summary",
    anchorElementId: "anchor_scoresummary",
    icon: (props) => (
      <SummarizeIcon
        fontSize="large"
        color="primary"
        {...props}
      ></SummarizeIcon>
    ),
    component: (props) => renderScoringSummary(props),
  },
  {
    id: "medicalHistory",
    title: "Pertinent Medical History",
    anchorElementId: `anchor_medicalhistory`,
    resources: ["Condition"],
    icon: (props) => (
      <MedicalInformationIcon
        fontSize="large"
        color="primary"
        {...props}
      ></MedicalInformationIcon>
    ),
    component: (props) => renderMedicalHistory(props),
  },
  {
    id: "observations",
    title: "Observations",
    anchorElementId: `anchor_observations`,
    resources: ["Observation"],
    icon: (props) => (
      <FactCheckIcon
        fontSize="large"
        color="primary"
        {...props}
      ></FactCheckIcon>
    ),
    component: (props) => renderObservations(props),
  },
  {
    id: "responses",
    title: "Questionnaire Responses",
    anchorElementId: `anchor_responses`,
    icon: (props) => (
      <BallotIcon fontSize="large" color="primary" {...props}></BallotIcon>
    ),
    component: (props) => renderSummaries(props),
  },
];
export default DEFAULT_SECTIONS;
