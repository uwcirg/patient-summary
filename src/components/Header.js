import { useContext } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { FhirClientContext } from "../context/FhirClientContext";
import { getEnv, imageOK } from "../util/util";

export default function Header() {
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
    if (!patient || !patient.birthDate) return "";
    return patient.birthDate;
  };
  const handleImageLoaded = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.classList.add("invisible");
      return;
    }
    e.target.classList.remove("invisible");
  };
  const renderTitle = () => (
    <Typography
      variant="h4"
      component="h1"
      sx={{ fontSize: { xs: "1.1rem", md: "1.8rem" } }}
    >
      Patient Summary
    </Typography>
  );
  const renderPatientName = () => {
    if (!hasPatientName()) return <div></div>;
    return (
      <Stack spacing={0.5} sx={{ paddingLeft: 1 }}>
        <Typography component="div">{getPatientName()}</Typography>
        <Typography component="div">{getPatientDob()}</Typography>
      </Stack>
    );
  };
  const renderLogo = () => (
    <img
      className="header-logo"
      src={`/assets/${getEnv("REACT_APP_PROJECT_ID")}/img/logo.png`}
      alt={"project logo"}
      onLoad={handleImageLoaded}
      onError={handleImageLoaded}
    ></img>
  );
  const renderReturnButton = () => {
    const returnURL = getEnv("REACT_APP_DASHBOARD_URL");
    if (!returnURL) return null;
    return (
      <Box sx={{ flex: 1, textAlign: "right", marginTop: 1, marginBotton: 1 }}>
        <Button
          color="primary"
          href={returnURL + "/clear_session"}
          variant="contained"
        >
          Patient List
        </Button>
      </Box>
    );
  };
  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar
        sx={{
          backgroundColor: theme.palette.lighter
            ? theme.palette.lighter.main
            : "#FFF",
          color: theme.palette.secondary
            ? theme.palette.secondary.main
            : "#444",
        }}
      >
        <Stack
          direction={"row"}
          spacing={2}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          {renderLogo()}
          {renderTitle()}
          {renderPatientName()}
          {renderReturnButton()}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
