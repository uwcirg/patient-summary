import dayjs from "dayjs";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export default function PatientInfo(props) {
  const theme = useTheme();
  const mutecColor =
    theme && theme.palette.muted && theme.palette.muted.main
      ? theme.palette.muted.main
      : "#777";
  const { patient } = props;
  const hasPatientName = () => {
    return patient && patient.name && patient.name.length;
  };
  const getPatientName = () => {
    if (!hasPatientName()) return "Patient name unknown";
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
      <Typography component="span" sx={{ color: mutecColor }}>
        dob:{" "}
      </Typography>
      <Typography component="span">{getPatientDob()}</Typography>
    </Box>
  );
  const renderAge = () => (
    <Box>
      <Typography
        component="span"
        sx={{
          color: mutecColor,
        }}
      >
        age:{" "}
      </Typography>
      <Typography component="span" className="patient-age">
        {getPatientAge()}
      </Typography>
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
  if (!patient) return null;
  return (
    <Box
      className="patientinfo-container"
      sx={{ marginLeft: theme.spacing(1) }}
    >
      <Stack spacing={0.5} direction="row" alignItems="center">
        <Typography
          component="span"
          className="patient-name"
          sx={{fontWeight: 500}}
        >
          {getPatientName()}
        </Typography>
      </Stack>
      <Stack
        spacing={1}
        direction="row"
        alignItems="center"
        className="patient-dob-container"
      >
        {renderDOB()}
        {renderAge()}
        {/* {renderGender()} */}
      </Stack>
    </Box>
  );
}

PatientInfo.propTypes = {
  patient: PropTypes.object,
};
