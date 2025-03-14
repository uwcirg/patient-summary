import React from "react";
import FHIR from "fhirclient";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { ThemeProvider } from "@mui/material/styles";
import ErrorComponent from "../components/ErrorComponent";
import { queryNeedPatientBanner, queryPatientIdKey } from "../consts/consts";
import { fetchEnvData, getEnv } from "../util/util";
import { getTheme } from "../config/theme_config";
import "../style/App.scss";

const fetchContextJson = async (authURL) => {
  if (!authURL) {
    // default, if no auth url provided
    return {
      clientId: "hello_world_client",
      scope: "profile roles email patient/*.read",
      // default to not show patient banner, can be overridden
      // cannot seem to override this when testing against SMART healthIT launcher though
      need_patient_banner: false,
    };
  }
  const response = await fetch(authURL, {
    // include cookies in request
    credentials: "include",
  }).catch((e) => {
    console.log(e);
    throw new Error(
      "Error retrieving context json via auth url. See console for detail."
    );
  });

  if (!response.ok) {
    console.log(response.status, response.statusText);
    throw new Error(`Error launch application: Server returned status ${response.status.toString()}`);
  }

  const contextJson = await response.json().catch((e) => {
    console.log(e);
    throw new Error("Context json parsing error. See console for detail.");
  });

  return contextJson;
};

export default function Launch() {
  const [error, setError] = React.useState("");
  fetchEnvData();
  React.useLayoutEffect(() => {
    const backendURL = getEnv("REACT_APP_CONF_API_URL");
    const authURL = backendURL ? `${backendURL}/auth/auth-info` : "";
    const urlParams = new URLSearchParams(window.location.search);
    //retrieve patient id from URL querystring if any
    const patientId = urlParams.get("patient");
    console.log("patient id from url query string: ", patientId);
    //retrieve need patient banner querystring if any
    const needPatientBanner = urlParams.get("need_patient_banner");
    console.log(
      "need_patient_banner from url query string: ",
      needPatientBanner
    );
    console.log("Auth url ", authURL);
    fetchContextJson(authURL).then(
      (json) => {
        if (!json) {
          setError("No valid context json specified");
          return;
        }
        if (patientId) {
          // only do this IF patient id comes from url queryString
          json.patientId = patientId;
          sessionStorage.setItem(queryPatientIdKey, patientId);
        }

        if (needPatientBanner !== null) {
          json.need_patient_banner = needPatientBanner;
          sessionStorage.setItem(queryNeedPatientBanner, needPatientBanner);
        }

        // allow client id to be configurable
        const envClientId = getEnv("REACT_APP_CLIENT_ID");
        if (envClientId) json.clientId = envClientId;

        // allow auth scopes to be updated via environment variable
        // see https://build.fhir.org/ig/HL7/smart-app-launch/scopes-and-launch-context.html
        const envAuthScopes = getEnv("REACT_APP_AUTH_SCOPES");
        if (envAuthScopes) json.scope = envAuthScopes;

        sessionStorage.setItem("launchContextJson", JSON.stringify(json));

        console.log("launch context json ", json);
        FHIR.oauth2.authorize(json).catch((e) => {
          console.log("FHIR auth error ", e);
          setError("Fhir auth error. see console for detail.");
        });
      },
      (error) => setError(error.message)
    );
  }, []);

  return (
    <ThemeProvider theme={getTheme()}>
      {error && <ErrorComponent message={error}></ErrorComponent>}
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
    </ThemeProvider>
  );
}
