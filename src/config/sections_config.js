import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import BallotIcon from "@mui/icons-material/Ballot";
const DEFAULT_SECTIONS = [
  {
    id: "medicalHistory",
    title: "Pertinent Medical History",
    icon: <MedicalInformationIcon fontSize="large" color="primary"></MedicalInformationIcon>,
  },
  {
    id: "responses",
    title: "Questionnaire Responses",
    icon: <BallotIcon fontSize="large" color="primary"></BallotIcon>,
  },
];
export default DEFAULT_SECTIONS;
