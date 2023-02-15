import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import BallotIcon from "@mui/icons-material/Ballot";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import MedicalHistory from "../components/MedicalHistory";
import Summary from "../components/Summary";

const renderMedicalHistory = (props) => {
  const patientBundle = props.patientBundle ? props.patientBundle : [];
  const conditions = patientBundle
    .filter((item) => {
      return item.resource && item.resource.resourceType === "Condition";
    })
    .map((item) => item.resource);
  if (!conditions.length)
    return <Alert severity="warning">No recorded condition.</Alert>;
  return <MedicalHistory data={conditions}></MedicalHistory>;
};
const renderSummaries = (props) => {
  const questionnaireList =
    props.questionnaireList && props.questionnaireList.length
      ? props.questionnaireList
      : [];
  if (!questionnaireList.length) {
    return (
      <Alert severity="error">No questionnaire list found.  Is it configured?</Alert>
    );
  }
  const summaryData = props.summaryData || [];
  return questionnaireList.map((questionnaireId, index) => {
    const dataObject =
      summaryData.data && summaryData.data[questionnaireId]
        ? summaryData.data[questionnaireId]
        : null;
    if (!dataObject) return null;
    return (
      <Box className="summary-container" key={`summary_container_${index}`}>
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
  });
};

const DEFAULT_SECTIONS = [
  {
    id: "medicalHistory",
    title: "Pertinent Medical History",
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
    icon: (props) => (
      <BallotIcon fontSize="large" color="primary" {...props}></BallotIcon>
    ),
    component: (props) => renderSummaries(props),
  },
];
export default DEFAULT_SECTIONS;
