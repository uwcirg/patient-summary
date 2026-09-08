import React, { use, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import FHIR from "fhirclient";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { FhirClientContext } from "./FhirClientContext";
import { queryPatientIdKey } from "@/consts";
import ErrorComponent from "@/components/ErrorComponent";
import { addMatomoTracking, getClientSessionKey, getEnv, getUserId } from "@/util";
import { writeToLog } from "@/util/log";

// Hoisted outside component — no closure over state/props
const reducer = (state, action) => ({ ...state, ...action });

const getPatient = async (client) => {
  if (!client) return;
  // Workaround for when patient id is NOT embedded within the JWT token
  const queryPatientId = sessionStorage.getItem(queryPatientIdKey);
  if (queryPatientId) {
    console.log("Using stored patient id ", queryPatientId);
    return client.request("/Patient/" + queryPatientId);
  }
  return client.patient.read();
};

function ReturnButton() {
  const returnURL = getEnv("REACT_APP_DASHBOARD_URL");
  if (!returnURL) return null;
  return (
    <Button
      color="primary"
      href={returnURL + "/clear_session"}
      variant="contained"
      sx={{ marginTop: 2, marginLeft: 2 }}
    >
      Back to Patient List
    </Button>
  );
}

function FhirClientContent({ children }) {
  const { client, patient, error } = use(FhirClientContext);

  if (error) {
    return (
      <>
        <ErrorComponent message={error.message} />
        <ReturnButton />
      </>
    );
  }

  if (client && patient) return children;

  return (
    <Stack spacing={2} direction="row" style={{ padding: "24px" }}>
      <CircularProgress />
      <div>Authorizing...</div>
    </Stack>
  );
}

FhirClientContent.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};

export default function FhirClientProvider(props) {
  const [state, dispatch] = useReducer(reducer, {
    client: null,
    patient: null,
    error: null,
  });

  useEffect(() => {
    FHIR.oauth2.ready().then(
      (client) => {
        console.log("Auth complete, client ready.");
        getPatient(client)
          .then((result) => {
            console.log("Patient loaded.");
            const userId = getUserId(client);
            const deviceInfo = typeof window !== "undefined" ? window.navigator.userAgent : "unknown";
            const deviceSize =
              typeof window !== "undefined" ? window.screen.width + "x" + window.screen.height : "unknown";
            const browserSize = window.innerWidth + "x" + window.innerHeight;
            addMatomoTracking(userId);
            writeToLog(
              "info",
              ["authSessionStarted", "device"],
              {
                subject: `Patient/${result.id}`,
                agent: { type: "user", who: userId, "user-agent": deviceInfo },
              },
              {
                authSessionID: getClientSessionKey(client),
                text: `auth session started : device=${deviceInfo}, deviceSize=${deviceSize}, browserSize=${browserSize}`,
              },
            );
            dispatch({ client, patient: result });
          })
          .catch((e) => dispatch({ error: e }));
      },
      (error) => {
        console.log("Auth error: ", error);
        dispatch({ error });
      },
    );
  }, []);

  return (
    <FhirClientContext.Provider value={state}>
      <FhirClientContent>{props.children}</FhirClientContent>
    </FhirClientContext.Provider>
  );
}

FhirClientProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
