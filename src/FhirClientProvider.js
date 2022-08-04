import { useState, useEffect, useCallback } from "react";
import FHIR from "fhirclient";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { FhirClientContext } from "./FhirClientContext";
import { queryPatientIdKey } from "./util/util";
import ErrorComponent from "./components/ErrorComponent";

export default function FhirClientProvider(props) {
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState(null);
  const [ready, setReady] = useState(false);

  const getPatient = useCallback(async () => {
    if (!client) return;

    //this is a workaround for when patient id is NOT embedded within the JWT token
    let queryPatientId = sessionStorage.getItem(queryPatientIdKey);
    if (queryPatientId) {
      console.log("Using stored patient id ", queryPatientId);
      return client.request("/Patient/" + queryPatientId);
    }
    // Get the Patient resource
    return await client.patient.read().then((pt) => {
      return pt;
    });
  }, [client]);

  useEffect(() => {
    FHIR.oauth2.ready().then(
      (client) => {
        console.log("Auth ready..");
        setClient(client);
      },
      (error) => {
        console.log("Auth error ", error);
        setError(error);
      }
    );
  }, []);

  useEffect(() => {
    if (!client) return;
    getPatient()
      .then((result) => {
        setPatient(result);
        setReady(true);
        setError("");
      })
      .catch((e) => {
        setError(e);
      });
  }, [client, getPatient]);

  return (
    <FhirClientContext.Provider
      value={{ client: client, patient: patient, error: error } || {}}
    >
      <FhirClientContext.Consumer>
        {({ client, error }) => {
          // any auth error that may have been rejected with
          if (error) {
            return <ErrorComponent message={error.message}></ErrorComponent>;
          }

          // if client and patient are available render the children component(s)
          if (!error && ready) {
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
