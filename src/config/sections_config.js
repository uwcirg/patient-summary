import MedicalInformationIcon from "@mui/icons-material/MedicalInformation";
import BallotIcon from "@mui/icons-material/Ballot";
const DEFAULT_SECTIONS = [
  {
    id: "medicalHistory",
    title: "Pertinent Medical History",
    icon: (props) => <MedicalInformationIcon fontSize="large" color="primary" {...props}></MedicalInformationIcon>,
  },
  {
    id: "responses",
    title: "Questionnaire Responses",
    icon: (props) => <BallotIcon fontSize="large" color="primary" {...props}></BallotIcon>,
  },
];
export default DEFAULT_SECTIONS;
