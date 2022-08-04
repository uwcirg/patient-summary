import React from "react";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import { initialzieCqlWorker } from "cql-worker";
import { FhirClientContext } from "../FhirClientContext";
import ErrorComponent from "./ErrorComponent";
import {
  getFHIRResourcePaths,
  getExpressionLogicLib,
  queryPatientIdKey,
} from "../util/util";

let patientBundle = {
  resourceType: "Bundle",
  id: "resource-bundle",
  type: "collection",
  entry: [],
};
// Define a web worker for evaluating CQL expressions
const cqlWorker = new Worker();
// Initialize the cql-worker
let [setupExecution, sendPatientBundle, evaluateExpression] =
  initialzieCqlWorker(cqlWorker);

const getCQLEvaluations = () => {
  //get CQL expression lib
  getExpressionLogicLib("Summary").then((data) => {
    // Load CQL ELM JSON, and value set cache which contains evaluated expressions for use by app
    const [elmJson, valueSetJson, namedExpression] = data;

    // Send the cqlWorker an initial message containing the ELM JSON representation of the CQL expressions
    setupExecution(elmJson, valueSetJson);
    // Send patient info to CQL worker to process
    sendPatientBundle(patientBundle);

    //named expression here is Summary, look in /src/cql/source/ExpressionLogicLibrary.cql and see how that is defined
    //can use the result(s) from evaluated expressions if desire
    evaluateExpression(namedExpression)
      .then((result) => {
        if (result) {
          console.log("CQL Results ", result);
        }
      })
      .catch((e) => {
        console.log("CQL Expression evaluation error ", e);
        throw new Error(e);
      });
  });
};

export default function Summary() {
  const contextContent = React.useContext(FhirClientContext);
  const [patient, setPatient] = React.useState(null);
  const [error, setError] = React.useState(null);

  const getPatient = React.useCallback(async () => {
    const client = contextContent.client;
    if (!client) return;
    //this is a workaround for when patient id is not embedded within the JWT token
    let queryPatientId = sessionStorage.getItem(queryPatientIdKey);
    if (queryPatientId) {
      console.log("Using stored patient id ", queryPatientId);
      return client.request("/Patient/" + queryPatientId);
    }
    // Get the Patient resource
    return await client.patient.read().then((pt) => {
      return pt;
    });
  }, [contextContent.client]);

  const getFhirResources = React.useCallback(
    async (id) => {
      if (!contextContent.client) return;
      const resources = getFHIRResourcePaths(id);
      const requests = resources.map((resource) =>
        contextContent.client.request(resource)
      );
      return Promise.all(requests).then((results) => {
        results.forEach((result) => {
          if (!result) return true;
          if (result.resourceType === "Bundle" && result.entry) {
            result.entry.forEach((o) => {
              if (o && o.resource)
                patientBundle.entry.push({ resource: o.resource });
            });
          } else if (Array.isArray(result)) {
            result.forEach((o) => {
              if (o.resourceType) patientBundle.entry.push({ resource: o });
            });
          } else {
            patientBundle.entry.push({ resource: result });
          }
        });
        //FHIR resources should be available now via patientBundle.entry
        console.log("FHIR resource bundles ", patientBundle.entry);
      });
    },
    [contextContent.client]
  );

  React.useEffect(() => {
    getPatient()
      .then((result) => {
        setPatient(result);
        console.log("patient fhir resource result ", result);
        if (!patientBundle.entry.length) {
          patientBundle.entry.unshift({ resource: result });
        }
        if (result) {
          getFhirResources(result.id);
          getCQLEvaluations();
        }
      })
      .catch((e) => {
        console.log("Error ", e);
        setError(e);
      });
  }, [getPatient, getFhirResources]);

  return (
    <React.Fragment>
      {error && <ErrorComponent messge={error}></ErrorComponent>}
      {/* write out patient info */}
      {patient && (
        <div>
          <h2>Hello World SoF App</h2>
          <div>
            Name: {patient.name[0].given.join(" ") + patient.name[0].family}
          </div>
          <div>DOB: {patient.birthDate}</div>
        </div>
      )}
    </React.Fragment>
  );
}
