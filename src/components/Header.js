import { useContext } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { FhirClientContext } from "../FhirClientContext";
import {getEnv, imageOK} from "../util/util";

export default function Header() {
  const { patient } = useContext(FhirClientContext);
  const hasPatientName = () => {
    return patient && patient.name && patient.name.length;
  };
  const getPatientName = () => {
    if (!hasPatientName()) return "";
    return [patient.name[0].family, patient.name[0].given[0]].join(", ");
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
  return (
    <AppBar position="fixed" elevation={1} role="heading">
      <Toolbar>
        <Stack direction={"row"} spacing={2} alignItems="center">
          <img style={{width:"180px"}} src={`/assets/${getEnv("REACT_APP_PROJECT_ID")}/logo.png`} alt={"project logo"} onLoad={handleImageLoaded} onError={handleImageLoaded}></img>
          <Typography variant="h4" component="h1" sx={{fontSize: {xs: '1.1rem', md: '1.8rem'}}}>
            Patient Summary
          </Typography>
          {hasPatientName() && (
            <Stack spacing={0.5}>
              <Typography component="div">
                {getPatientName()}
              </Typography>
              <Typography component="div">
                {getPatientDob()}
              </Typography>
            </Stack>
          )}
          </Stack>
      </Toolbar>
    </AppBar>
  );
}
