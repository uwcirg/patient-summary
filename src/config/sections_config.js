import { lazy, Suspense } from "react";
import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import BallotIcon from "@mui/icons-material/Ballot";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";

const renderLoader = () => (
  <Stack
    direction="row"
    spacing={2}
    alignItems="center"
    sx={{
      marginTop: "8px",
      marginBottom: "8px",
    }}
  >
    <Box color="primary">Loading content ...</Box>
    <CircularProgress color="primary" size={24}></CircularProgress>
  </Stack>
);

const renderMedicalHistory = (props) => {
  const patientBundle = props.patientBundle ? props.patientBundle : [];
  const conditions = patientBundle
    .filter((item) => {
      return item.resource && item.resource.resourceType === "Condition";
    })
    .map((item) => item.resource);
  if (!conditions.length)
    return <Alert severity="warning">No recorded condition.</Alert>;
  const MedicalHistory = lazy(() => import("../components/MedicalHistory"));
  return (
    <Suspense fallback={renderLoader()}>
      <MedicalHistory data={conditions}></MedicalHistory>
    </Suspense>
  );
};
const renderSummaries = (props) => {
  const questionnaireList =
    props.questionnaireList && props.questionnaireList.length
      ? props.questionnaireList
      : [];
  if (!questionnaireList.length) {
    return (
      <Alert severity="error">
        No questionnaire id(s) found. Is it configured?
      </Alert>
    );
  }
  const Summary = lazy(() => import("../components/Summary"));
  const summaryData = props.summaryData || [];
  return (
    <Suspense fallback={renderLoader()}>
      {questionnaireList.map((questionnaireId, index) => {
        const dataObject =
          summaryData.data && summaryData.data[questionnaireId]
            ? summaryData.data[questionnaireId]
            : null;
        if (!dataObject) return null;
        return (
          <Box className="summary-container" key={`summary_${questionnaireId}`}>
            <Summary
              questionnaireId={questionnaireId}
              data={dataObject}
              key={`questionnaire_summary_${index}`}
            ></Summary>
            {index !== questionnaireList.length - 1 && (
              <Divider
                className="print-hidden"
                key={`questionnaire_divider_${index}`}
                sx={{ borderWidth: "2px", marginBottom: 2 }}
                light
              ></Divider>
            )}
          </Box>
        );
      })}
    </Suspense>
  );
};

const DEFAULT_SECTIONS = [
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
