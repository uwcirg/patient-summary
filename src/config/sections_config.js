import { lazy, Suspense } from "react";
import BallotIcon from "@mui/icons-material/Ballot";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import SummarizeIcon from "@mui/icons-material/Summarize";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

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
  const ScoreSummary = lazy(() =>
    import("../components/sections/ScoringSummary")
  );
  return (
    <Suspense fallback={renderLoader()}>
      <ScoreSummary
        list={props.questionnaireList}
        summaryData={summaryData.data}
      ></ScoreSummary>
    </Suspense>
  );
};

const renderMedicalHistory = (props) => {
  const patientBundle = props.patientBundle ? props.patientBundle : [];
  const conditions = patientBundle
    .filter((item) => {
      return item.resource && item.resource.resourceType === "Condition";
    })
    .map((item) => item.resource);
  const MedicalHistory = lazy(() =>
    import("../components/sections/MedicalHistory")
  );
  return (
    <Suspense fallback={renderLoader()}>
      <MedicalHistory data={conditions}></MedicalHistory>
    </Suspense>
  );
};
const renderSummaries = ({ questionnaireList, summaryData }) => {
  const Summaries = lazy(() => import("../components/sections/Summaries"));
  return (
    <Suspense fallback={renderLoader()}>
      {
        <Summaries
          questionnaireList={questionnaireList}
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
