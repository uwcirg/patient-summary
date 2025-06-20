import React, { useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import FHIR from "fhirclient";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { queryPatientIdKey } from "../consts/consts";
import ErrorComponent from "../components/ErrorComponent";
import {
  addMamotoTracking,
  getClientSessionKey,
  getEnv,
  getUserId,
} from "../util";
import { writeToLog } from "../util/log";
import { FhirClientContext } from "./FhirClientContext";

export default function FhirClientProvider(props) {
  const reducer = (state, action) => {
    return {
      ...state,
      ...action,
    };
  };

  const [state, dispatch] = useReducer(reducer, {
    client: null,
    patient: null,
    error: null,
  });

  const getPatient = async (client) => {
    if (!client) return;

    //this is a workaround for when patient id is NOT embedded within the JWT token
    let queryPatientId = sessionStorage.getItem(queryPatientIdKey);
    if (queryPatientId) {
      console.log("Using stored patient id ", queryPatientId);
      return client.request("/Patient/" + queryPatientId);
    }
    // Get the Patient resource
    return await client.patient.read();
  };

  const renderReturnButton = () => {
    const returnURL = getEnv("REACT_APP_DASHBOARD_URL");
    if (!returnURL) return null;
    return (
      <Button
        color="primary"
        href={returnURL + "/clear_session"}
        variant="contained"
        sx={{
          marginTop: 2,
          marginLeft: 2,
        }}
      >
        Back to Patient List
      </Button>
    );
  };

  useEffect(() => {
    FHIR.oauth2.ready().then(
      (client) => {
        console.log("Auth complete, client ready.");
        getPatient(client)
          .then((result) => {
            console.log("Patient loaded.");
            addMamotoTracking(getUserId(client));
            writeToLog(
              "info",
              ["authSessionStarted"],
              {
                subject: `Patient/${result.id}`,
              },
              {
                authSessionID: getClientSessionKey(client),
                text: "auth session started",
              }
            );
            dispatch({
              client: client,
              patient: result,
            });
          })
          .catch((e) => {
            dispatch({
              error: e,
            });
          });
      },
      (error) => {
        console.log("Auth error: ", error);
        dispatch({
          error: error,
        });
      }
    );
  }, []);

  return (
    <FhirClientContext.Provider value={state}>
      <FhirClientContext.Consumer>
        {({ client, patient, error }) => {
          // any auth error that may have been rejected with
          if (error) {
            return (
              <>
                <ErrorComponent message={error.message}></ErrorComponent>
                {renderReturnButton()}
              </>
            );
          }

          // if client and patient are available render the children component(s)
          if (client && patient) {
            return props.children;
          }

          // client is undefined until auth.ready() is fulfilled
          return (
            <Stack spacing={2} direction="row" style={{ padding: "24px" }}>
              <CircularProgress></CircularProgress>
              <div>Authorizing...</div>
            </Stack>
          );
        }}
      </FhirClientContext.Consumer>
    </FhirClientContext.Provider>
  );
}

FhirClientProvider.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
