import { useEffect, useState } from "react";
import FHIR from "fhirclient";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { FhirClientContext } from "./FhirClientContext";
import { queryPatientIdKey } from "../consts/consts";
import ErrorComponent from "../components/ErrorComponent";
import {getEnv, getDefaultMessageObject} from "../util/util";
import { writeToLog } from "../util/log";

export default function FhirClientProvider(props) {
  const [client, setClient] = useState(null);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);

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
          marginLeft: 2
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
        setClient(client);
        getPatient(client)
          .then((result) => {
            console.log("Patient loaded.");
            setPatient(result);
            setError(null);
            writeToLog(
              "info",
              ["authSessionCreated"],
              getDefaultMessageObject(client, result)
            );
          })
          .catch((e) => {
            setError(e);
          });
      },
      (error) => {
        console.log("Auth error: ", error);
        setError(error);
      }
    );
  }, []);

  return (
    <FhirClientContext.Provider
      value={{ client: client, patient: patient, error: error } || {}}
    >
      <FhirClientContext.Consumer>
        {({ client, error }) => {
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
