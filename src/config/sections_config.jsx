import React, { lazy, Suspense } from "react";
import BallotIcon from "@mui/icons-material/BallotOutlined";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformationOutlined";
import FactCheckIcon from "@mui/icons-material/FactCheckOutlined";
import SummarizeIcon from "@mui/icons-material/SummarizeOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { isEmptyArray } from "@util";
import Loader from "@components/Loader";

const renderLoader = () => (
  <Loader message="Retrieving content..." styles={{ position: "relative", width: "auto", height: "auto" }}></Loader>
);

const renderScoringSummary = (props) => {
  const summaryData = props.summaryData?.data;
  const ScoreSummary = lazy(() => import("../components/sections/ScoringSummary"));
  const ChartSummary = lazy(() => import("../components/graphs/SummaryChart"));
  const chartData = props.allChartData;
  const chartKeys = props.chartKeys;
  return (
    <Suspense fallback={renderLoader()}>
      <Stack
        spacing={1}
        direction={`${!isEmptyArray(chartData) && chartData.length < 20 ? "row" : "column"}`}
        alignItems={"top"}
        sx={{
          gap: (theme) => theme.spacing(1),
          marginLeft: (theme) => theme.spacing(1),
          marginRight: (theme) => theme.spacing(1),
        }}
        flexWrap={"wrap"}
        className="score-summary-wrapper"
      >
        {!isEmptyArray(chartData) && chartKeys.length > 1 && (
          <Box
            sx={{
              flex: {
                xs: "auto",
                sm: "auto",
                md: "auto",
                lg: 2,
              },
              width: "100%",
            }}
            className="chart-container-wrapper"
          >
            <ChartSummary data={chartData} keys={chartKeys}></ChartSummary>
          </Box>
        )}
        <Box
          sx={{
            flex: {
              xs: "auto",
              sm: "auto",
              md: "auto",
              lg: 2.5,
            },
          }}
        >
          <ScoreSummary summaryData={summaryData}></ScoreSummary>
        </Box>
      </Stack>
    </Suspense>
  );
};

const renderConditions = (props) => {
  const Conditions = lazy(() => import("../components/sections/Conditions"));
  return (
    <Suspense fallback={renderLoader()}>
      <Conditions data={props?.Condition}></Conditions>
    </Suspense>
  );
};
const renderObservations = (props) => {
  const Observation = lazy(() => import("../components/sections/Observations"));
  return (
    <Suspense fallback={renderLoader()}>
      <Observation data={props?.Observation}></Observation>
    </Suspense>
  );
};
const renderSummaries = ({ summaryData }) => {
  const Summaries = lazy(() => import("../components/sections/Summaries"));
  return <Suspense fallback={renderLoader()}>{<Summaries summaryData={summaryData}></Summaries>}</Suspense>;
};

const DEFAULT_RESOURCES = ["Questionnaire", "QuestionnaireResponse"];

export const sections = [
  {
    id: "scoreSummary",
    title: "Score Summary",
    resources: DEFAULT_RESOURCES,
    icon: (props) => <SummarizeIcon fontSize="medium" color="primary" {...props}></SummarizeIcon>,
    component: (props) => renderScoringSummary(props),
    default: true,
  },
  {
    id: "questionnaireResponses",
    title: "Questionnaire Responses",
    resources: DEFAULT_RESOURCES,
    icon: (props) => <BallotIcon fontSize="medium" color="primary" {...props}></BallotIcon>,
    component: (props) => renderSummaries(props),
    default: true,
  },
  {
    id: "conditions",
    title: "Conditions",
    resources: ["Condition"],
    icon: (props) => <MedicalInformationIcon fontSize="medium" color="primary" {...props}></MedicalInformationIcon>,
    component: (props) => renderConditions(props),
    //default: true,
  },
  {
    id: "observations",
    title: "Observations",
    resources: ["Observation"],
    icon: (props) => <FactCheckIcon fontSize="medium" color="primary" {...props}></FactCheckIcon>,
    component: (props) => renderObservations(props),
    //default: true,
  },
];
const DEFAULT_SECTIONS = sections.filter((item) => !!item.default);
export default DEFAULT_SECTIONS;
