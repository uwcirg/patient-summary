import React from "react";
import FHIR from "fhirclient";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import ErrorComponent from "./ErrorComponent";
import { fetchEnvData, getEnv, queryPatientIdKey } from "../util/util.js";
import "../style/App.scss";

export default function Launch() {
  const [error, setError] = React.useState("");

  React.useEffect(() => fetchEnvData(), []);
  React.useEffect(() => {
    const backendURL = getEnv("REACT_APP_BACKEND_URL");
    const authURL = backendURL
      ? `${backendURL}/auth/auth-info`
      : "launch-context.json";
    const urlParams = new URLSearchParams(window.location.search);
    //retrieve patient id from URL querystring if any
    const patientId = urlParams.get("patient");
    console.log("patient id from url query string: ", patientId);
    console.log("Auth url ", authURL);
    fetch(authURL, {
      // include cookies in request
      credentials: "include",
    })
      .then((result) => {
        if (!result.ok) {
          throw new Error(result.status.toString());
        }
        return result.json();
      })
      .catch((e) => setError(e))
      .then((json) => {
        if (patientId) {
          //only do this IF patient id comes from url queryString
          json.patientId = patientId;
          sessionStorage.setItem(queryPatientIdKey, patientId);
        }
        //allow auth scopes to be updated via environment variable
        //see https://build.fhir.org/ig/HL7/smart-app-launch/scopes-and-launch-context.html
        const envAuthScopes = getEnv("REACT_APP_AUTH_SCOPES");
        if (envAuthScopes) json.scope = envAuthScopes;
        console.log("launch context json ", json);
        FHIR.oauth2.authorize(json).catch((e) => {
          setError(e);
        });
      })
      .catch((e) => {
        setError(e);
        console.log("launch error ", e);
      });
  }, []);

  return (
    <React.Fragment>
      {error && <ErrorComponent message={error.message}></ErrorComponent>}
      {!error && (
        <Stack
          spacing={2}
          direction="row"
          style={{ padding: "24px" }}
          alignItems="center"
        >
          <CircularProgress></CircularProgress>
          <div>Launching ...</div>
        </Stack>
      )}
    </React.Fragment>
  );
}
