//import dayjs from "dayjs";
import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Patient from "@/models/Patent";

export default function PatientInfo(props) {
  const theme = useTheme();
  const { patient } = props;
  const patientObj = new Patient(patient);
  const getPatientName = () => {
    return patientObj.name ?? "unknown";
  };
  const getPatientDob = () => {
    return patientObj.dob ?? "--";
  };
  const getPatientAge = () => {
    return patientObj.age ?? "--";
  };
  const renderMRN = () => {
    if (!patientObj.mrn) return "--";
    return (
      <Box>
        <Typography component="span" sx={{ color: "muted.main", marginLeft: "2px" }} variant="body2">
          MRN:{" "}
        </Typography>
        <Typography component="span" variant="body2">
          {patientObj.mrn}
        </Typography>
      </Box>
    );
  };
  const renderDOB = () => (
    <Box>
      <Typography component="span" sx={{ color: "muted.main" }} variant="body2">
        dob:{" "}
      </Typography>
      <Typography component="span" variant="body2">
        {getPatientDob()}
      </Typography>
    </Box>
  );
  const renderAge = () => (
    <Box>
      <Typography
        component="span"
        sx={{
          color: "muted.main",
        }}
        variant="body2"
      >
        age:{" "}
      </Typography>
      <Typography component="span" variant="body2" className="patient-age">
        {getPatientAge()}
      </Typography>
    </Box>
  );
  if (!patient) return null;
  return (
    <Box className="patientinfo-container" sx={{ marginLeft: theme.spacing(1), padding: theme.spacing(0.25, 0, 0.25) }}>
      <Stack spacing={1} direction="row" alignItems="center">
        <Typography component="span" className="patient-name" sx={{ fontWeight: 500 }}>
          {getPatientName()}
        </Typography>
        {renderMRN()}
      </Stack>
      <Stack spacing={1} direction="row" alignItems="center" className="patient-dob-container">
        {renderDOB()}
        {renderAge()}
      </Stack>
    </Box>
  );
}

PatientInfo.propTypes = {
  patient: PropTypes.object,
};
