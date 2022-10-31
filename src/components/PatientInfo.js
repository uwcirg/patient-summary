import dayjs from "dayjs";
import { useTheme } from "@mui/material/styles";
import { useContext } from "react";
import PersonIcon from "@mui/icons-material/Person";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { FhirClientContext } from "../context/FhirClientContext";

export default function PatientInfo() {
  const theme = useTheme();
  const { patient } = useContext(FhirClientContext);
  const hasPatientName = () => {
    return patient && patient.name && patient.name.length;
  };
  const getPatientName = () => {
    if (!hasPatientName()) return "";
    const familyName = patient.name[0].family ? patient.name[0].family : "";
    const givenName =
      patient.name[0].given && patient.name[0].given.length
        ? patient.name[0].given[0]
        : "";
    return [familyName, givenName].join(", ");
  };
  const getPatientDob = () => {
    if (!patient || !patient.birthDate) return "--";
    return patient.birthDate;
  };
  const getPatientAge = () => {
    const dob = getPatientDob();
    if (!dob) return "--";
    const today = new Date().toLocaleDateString("en-us");
    const date1 = dayjs(today);
    const date2 = dayjs(dob);
    return date1.diff(date2, "year");
  };
  // const getPatientGender = () => {
  //   if (!patient.gender) return "--";
  //   return patient.gender;
  // };
  const renderDOB = () => (
    <Box>
      <Typography component="span" sx={{ color: theme.palette.muted.main }}>
        dob:{" "}
      </Typography>
      <Typography component="span">{getPatientDob()}</Typography>
    </Box>
  );
  const renderAge = () => (
    <Box>
      <Typography component="span" sx={{ color: theme.palette.muted.main }}>
        age:{" "}
      </Typography>
      <Typography component="span">{getPatientAge()}</Typography>
    </Box>
  );
  // const renderGender = () => (
  //   <Box>
  //     <Typography component="span" sx={{ color: theme.palette.muted.main }}>
  //       gender:{" "}
  //     </Typography>
  //     <Typography component="span" sx={{ textTransform: "capitalize" }}>
  //       {getPatientGender()}
  //     </Typography>
  //   </Box>
  // );
  return (
    <Stack spacing={3} direction="row">
      <Stack spacing={0.5} direction="row" alignItems="center">
        <PersonIcon fontSize="large" color="primary"></PersonIcon>
        <Typography component="span" variant="h6" color="primary">
          {getPatientName()}
        </Typography>
      </Stack>
      <Stack spacing={1} direction="row" alignItems="center">
        {renderDOB()}
        {renderAge()}
        {/* {renderGender()} */}
      </Stack>
    </Stack>
  );
}
