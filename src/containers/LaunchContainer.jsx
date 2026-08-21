import React, { useState, useEffect } from "react";
import FHIR from "fhirclient";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { ThemeProvider } from "@mui/material/styles";
import ErrorComponent from "../components/ErrorComponent";
import { queryNeedPatientBanner, queryPatientIdKey } from "../consts";
import { fetchEnvData, getEnv } from "@/util";
import { getTheme } from "@/config/theme_config";
import "../style/App.scss";

const fetchContextJson = async (authURL) => {
  if (!authURL) {
    return {
      clientId: "patient_summary_client",
      scope: "profile roles email patient/*.read",
    };
  }

  const response = await fetch(authURL, {
    credentials: "include",
  }).catch((e) => {
    console.log(e);
    throw new Error("Error retrieving context json via auth url. See console for detail.");
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
  const [error, setError] = useState(null);

  useEffect(() => {
    async function launch() {
      try {
        const results = await fetchEnvData();
        console.log("environment variables ", results);

        const backendURL = getEnv("REACT_APP_CONF_API_URL");
        const authURL = backendURL ? `${backendURL}/auth/auth-info` : "";

        const urlParams = new URLSearchParams(window.location.search);
        const patientId = urlParams.get("patient");
        console.log("patient id from url query string: ", patientId);

        const needPatientBannerFromUrl = urlParams.get("need_patient_banner");
        console.log("need_patient_banner from url query string: ", needPatientBannerFromUrl);
        console.log("Auth url ", authURL);

        const json = await fetchContextJson(authURL);

        if (!json) {
          setError("No valid context json specified");
          return;
        }

        if (patientId) {
          json.patientId = patientId;
          sessionStorage.setItem(queryPatientIdKey, patientId);
        }

        if (needPatientBannerFromUrl !== null) {
          json.need_patient_banner = needPatientBannerFromUrl;
          sessionStorage.setItem(queryNeedPatientBanner, needPatientBannerFromUrl);
        } else if ("need_patient_banner" in json) {
          sessionStorage.setItem(queryNeedPatientBanner, json.need_patient_banner);
        } else if ("token_data" in json && "need_patient_banner" in json.token_data) {
          sessionStorage.setItem(queryNeedPatientBanner, json.token_data.need_patient_banner);
        }

        const envClientId = getEnv("REACT_APP_CLIENT_ID");
        if (envClientId) json.clientId = envClientId;

        // see https://build.fhir.org/ig/HL7/smart-app-launch/scopes-and-launch-context.html
        const envAuthScopes = getEnv("REACT_APP_AUTH_SCOPES");
        if (envAuthScopes) json.scope = envAuthScopes;

        sessionStorage.setItem("launchContextJson", JSON.stringify(json));
        console.log("launch context json ", json);

        await FHIR.oauth2.authorize(json).catch((e) => {
          console.log("FHIR auth error ", e);
          throw new Error("Fhir auth error. see console for detail.");
        });
      } catch (e) {
        setError(e?.message ?? "Unknown error");
      }
    }

    launch();
  }, []);

  return (
    <ThemeProvider theme={getTheme()}>
      {error && <ErrorComponent message={error} />}
      {!error && (
        <Stack spacing={2} direction="row" sx={[{ alignItems: "center" }, (theme) => ({ padding: theme.spacing(3) })]}>
          <CircularProgress />
          <div>Launching ...</div>
        </Stack>
      )}
    </ThemeProvider>
  );
}
