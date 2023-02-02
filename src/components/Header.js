import PropTypes from "prop-types";
import { useContext } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import PatientInfo from "./PatientInfo";
import { getEnv, imageOK } from "../util/util";
import { FhirClientContext } from "../context/FhirClientContext";

export default function Header(props) {
  const theme = useTheme();
  const { patient } = useContext(FhirClientContext);
  const { returnURL } = props;
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
      sx={{
        fontSize: "1.85rem",
        fontWeight: 500,
        display: { xs: "none", sm: "none", md: "block" },
      }}
    >
      Patient Summary
    </Typography>
  );
  const renderLogo = () => (
    <>
      <Box
        sx={{
          display: {
            xs: "none",
            sm: "none",
            md: "block",
          },
        }}
      >
        <img
          className="header-logo"
          src={`/assets/${getEnv("REACT_APP_PROJECT_ID")}/img/logo.png`}
          alt={"project logo"}
          onLoad={handleImageLoaded}
          onError={handleImageLoaded}
        ></img>
      </Box>
      <Box
        sx={{
          display: {
            xs: "block",
            sm: "block",
            md: "none",
          },
        }}
      >
        <img
          src={`/assets/${getEnv("REACT_APP_PROJECT_ID")}/img/logo_mobile.png`}
          alt={"project logo"}
          onLoad={handleImageLoaded}
          onError={handleImageLoaded}
        ></img>
      </Box>
    </>
  );
  const renderPatientInfo = () => <PatientInfo patient={patient}></PatientInfo>;
  const renderReturnButton = () => {
    if (!returnURL) return null;
    return (
      <Box
        className="print-hidden"
        sx={{ flex: 1, textAlign: "right", marginTop: 0.5, marginBotton: 0.5 }}
      >
        <Button
          color="primary"
          href={returnURL + "/clear_session"}
          variant="contained"
          className="btn-return-url"
          size="large"
        >
          Patient List
        </Button>
      </Box>
    );
  };
  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{ paddingRight: "0 !important", paddingLeft: "0 !important" }}
    >
      <Toolbar
        sx={{
          backgroundColor: theme.palette.lighter
            ? theme.palette.lighter.main
            : "#FFF",
          color: theme.palette.secondary
            ? theme.palette.secondary.main
            : "#444",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2)
        }}
        disableGutters={true}
      >
        <Stack
          direction={"row"}
          spacing={2.5}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          {renderLogo()}
          {renderTitle()}
          <Stack direction={"row"} sx={{ flex: "1 1" }} alignItems="center">
            {renderPatientInfo()}
            {renderReturnButton()}
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

Header.propTypes = {
  returnURL: PropTypes.string,
};
