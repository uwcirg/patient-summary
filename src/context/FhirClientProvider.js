import { useEffect, useState } from "react";
import { useQuery } from "react-query";
import FHIR from "fhirclient";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import CircularProgress from "@mui/material/CircularProgress";
import { FhirClientContext } from "./FhirClientContext";
import { queryPatientIdKey } from "../consts/consts";
import ErrorComponent from "../components/ErrorComponent";
import {getEnv} from "../util/util";

export default function FhirClientProvider(props) {
  const [client, setClient] = useState(null);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const authResult = useQuery("fhirAuth", async () =>
    FHIR.oauth2.ready().then((result) => {
      console.log("Auth complete, client ready.");
      console.log("auth result ", result);
      setClient(result);
      return getPatient(result);
    }).catch(e => setError(e))
  );

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
    if (authResult.status === "error") {
      console.log(authResult.error);
      setError("FHIR auth error.  See console for detail.");
    }
    if (authResult.status === "success") {
      setPatient(authResult.data);
    }
  }, [authResult]);

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
