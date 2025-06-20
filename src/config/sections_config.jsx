import React, { lazy, Suspense } from "react";
import BallotIcon from "@mui/icons-material/BallotOutlined";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformationOutlined";
import FactCheckIcon from "@mui/icons-material/FactCheckOutlined";
import SummarizeIcon from "@mui/icons-material/SummarizeOutlined";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { getDefaultInterventionLogicLib, getResourceLogicLib} from "../util/elmUtil";

const resourceLogicLibrary = getResourceLogicLib()[0];
const defaultInterventionLibrary = getDefaultInterventionLogicLib();

const renderLoader = () => (
  <Stack
    direction="row"
    spacing={1}
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
  const summaryData = props.summaryData?.data || {};
  const ScoreSummary = lazy(() => import("../components/sections/ScoringSummary"));
  const ChartSummary = lazy(() => import("../components/graphs/SummaryChart"));
  const chartData = props.allChartData;
  const chartKeys = [...new Set(chartData?.map((o) => o.key))];
  return (
    <Suspense fallback={renderLoader()}>
      <Stack
        spacing={1}
        direction={"row"}
        alignItems={"center"}
        sx={{
          marginLeft: (theme) => theme.spacing(1),
          marginRight: (theme) => theme.spacing(1),
          gap: (theme) => theme.spacing(1)
        }}
        flexWrap={"wrap"}
      >
        <Box sx={{flex: {
            xs: "auto",
            sm: "auto",
            md: "auto",
            lg: 2
          }}}>
          <ChartSummary data={chartData} keys={chartKeys}></ChartSummary>
        </Box>
        <Box sx={{flex: {
            xs: "auto",
            sm: "auto",
            md: "auto",
            lg: 2.5
          }}}>
          <ScoreSummary summaryData={summaryData}></ScoreSummary>
        </Box>
      </Stack>
    </Suspense>
  );
};

const renderMedicalHistory = (props) => {
  const MedicalHistory = lazy(() => import("../components/sections/MedicalHistory"));
  return (
    <Suspense fallback={renderLoader()}>
      <MedicalHistory data={props.evalData?.Condition}></MedicalHistory>
    </Suspense>
  );
};
const renderObservations = (props) => {
  const Observation = lazy(() => import("../components/sections/Observations"));
  return (
    <Suspense fallback={renderLoader()}>
      <Observation data={props.evalData?.Observation}></Observation>
    </Suspense>
  );
};
const renderSummaries = ({ questionnaireKeys, summaryData }) => {
  const Summaries = lazy(() => import("../components/sections/Summaries"));
  return (
    <Suspense fallback={renderLoader()}>
      {<Summaries questionnaireKeys={questionnaireKeys} summaryData={summaryData}></Summaries>}
    </Suspense>
  );
};

const DEFAULT_SECTIONS = [
  {
    id: "scoreSummary",
    title: "Score Summary",
    anchorElementId: "anchor_scoresummary",
    library: defaultInterventionLibrary,
    icon: (props) => <SummarizeIcon fontSize="medium" color="primary" {...props}></SummarizeIcon>,
    component: (props) => renderScoringSummary(props),
  },
  {
    id: "conditions",
    title: "Medical History",
    anchorElementId: `anchor_medicalhistory`,
    library: resourceLogicLibrary,
    icon: (props) => <MedicalInformationIcon fontSize="medium" color="primary" {...props}></MedicalInformationIcon>,
    component: (props) => renderMedicalHistory(props),
  },
  {
    id: "observations",
    title: "Clinical / Social History",
    anchorElementId: `anchor_observations`,
    library: resourceLogicLibrary,
    icon: (props) => <FactCheckIcon fontSize="medium" color="primary" {...props}></FactCheckIcon>,
    component: (props) => renderObservations(props),
  },
  {
    id: "questionnaireResponses",
    title: "Questionnaire Responses",
    anchorElementId: `anchor_responses`,
    library: defaultInterventionLibrary,
    icon: (props) => <BallotIcon fontSize="medium" color="primary" {...props}></BallotIcon>,
    component: (props) => renderSummaries(props),
  },
];
export default DEFAULT_SECTIONS;
