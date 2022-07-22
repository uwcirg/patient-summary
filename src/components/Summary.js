import { useCallback, useState, useEffect, useContext } from "react";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import { Typography } from "@mui/material";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import { initialzieCqlWorker } from "cql-worker";
import { FhirClientContext } from "../FhirClientContext";
import QuestionnaireSelector from "./QuestionnaireSelector";
import Error from "./Error";
import {
  getFHIRResourcePaths,
  getInterventionLogicLib,
  getChartConfig,
} from "../util/util";
import Responses from "./Responses";
import Chart from "./Chart";

export default function Summary() {
  // Define a web worker for evaluating CQL expressions
  const cqlWorker = new Worker();
  // Initialize the cql-worker
  const [setupExecution, sendPatientBundle, evaluateExpression] =
    initialzieCqlWorker(cqlWorker);
  const { client, patient } = useContext(FhirClientContext);
  const [questionnaire, setQuestionnaire] = useState("");
  const [summary, setSummary] = useState({});
  const [ready, setReady] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState("");
  const [patientBundle, setPatientBundle] = useState({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [{ resource: patient }],
    responses: [],
    chartData: [],
    chartConfig: [],
  });
  const shouldDisplayResponses = () => ready && questionnaire && questionnaire.length > 0;
  const handleSelectorChange = (event) => {
    const selectedQuestionnaire = event.target.value;
    if (!selectedQuestionnaire) {
      setSummary({ ...summary, responses: [] });
      setReady(true);
      setChartReady(true);
      return;
    }
    setReady(false);
    setChartReady(false);
    setQuestionnaire(selectedQuestionnaire);
    //get formatted summary for the selected questionnaire
    getCQLEvaluations(selectedQuestionnaire).then(
      (result) => {
        if (!result || !result.length) {
          setChartReady(false);
          setReady(true);
          return;
        }
        console.log("CQL Result ", result)
        setSummary((prevSummary) => {
          return {
            ...prevSummary,
            ...{
              responses: result,
            },
          };
        });
        // get chart data for the selected questionnaire
        getChartData().then(
          (chartData) => {
            const hasChartData = chartData && chartData.length;
            if (hasChartData) {
              console.log("chart data? ", chartData)
              setSummary((prevSummary) => {
                return {
                  ...prevSummary,
                  ...{
                    chartData: chartData,
                    chartConfig: getChartConfig(selectedQuestionnaire),
                  },
                };
              });
            }
            setChartReady(hasChartData ? true : false);
            setReady(true);
          },
          (e) => setError(e)
        ); // getChartData
      }, // getCQLEvaluations,
      (e) => setError(e)
    );
  };

  const getFhirResources = useCallback(async () => {
    if (!client || !patient || !patient.id)
      throw new Error("Patient id is missing");
    const resources = getFHIRResourcePaths(patient.id);
    const requests = resources.map((resource) => client.request(resource));
    return Promise.allSettled(requests).then((results) => {
      let bundle = [];
      results.forEach((item) => {
        if (item.status === "rejected") {
          console.log("Fhir resource retrieval error ", item.reason);
          return true;
        }
        const result = item.value;
        if (result.resourceType === "Bundle" && result.entry) {
          result.entry.forEach((o) => {
            if (o && o.resource) bundle.push({ resource: o.resource });
          });
        } else if (Array.isArray(result)) {
          result.forEach((o) => {
            if (o.resourceType) bundle.push({ resource: o });
          });
        } else {
          bundle.push({ resource: result });
        }
      });
      return bundle;
    });
  }, [client, patient]);

  const getCQLEvaluations = async (questionnaire) => {
    /* get CQL expressions */
    const [elmJson, valueSetJson] = await getInterventionLogicLib(
      questionnaire
    ).catch((e) => setError(e));
    // Send the cqlWorker an initial message containing the ELM JSON representation of the CQL expressions
    setupExecution(elmJson, valueSetJson);
    // Send patient info to CQL worker to process
    sendPatientBundle(patientBundle);
    // get formatted questionnaire responses
    const qResponses = await evaluateExpression("ResponsesSummary").catch((e) =>
      setError(e)
    );
    return qResponses;
  };

  const getChartData = async () => {
    let chartData = null;
    chartData = await evaluateExpression("ChartData").catch((e) => setError(e));
    if (chartData && chartData.length) {
      chartData = chartData.map((item, index) => {
        return { ...item, index: index };
      });
    }
    return chartData;
  };
  useEffect(() => {
    const gatherPatientData = async () => {
      /* get FHIR resources */
      const fhirData = await getFhirResources().catch((e) => setError(e));
      setPatientBundle((prevPatientBundle) => {
        return {
          ...prevPatientBundle,
          entry: [...prevPatientBundle.entry, ...fhirData],
        };
      });
      setReady(true);
    };
    gatherPatientData();
  }, [getFhirResources]);

  return (
    <div id="summary">
      {error && <Error message={error}></Error>}
      {!error && !ready && (
        <div>
          <LinearProgress
            sx={{ width: "300px", marginTop: 7 }}
          ></LinearProgress>
        </div>
      )}
      {!error && ready && (
        <Stack>
          <Typography variant="h6" component="h2" color="secondary">
            View Summary by Questionnaire
          </Typography>
          <QuestionnaireSelector
            selected={questionnaire}
            handleSelectorChange={handleSelectorChange}
          ></QuestionnaireSelector>
          {shouldDisplayResponses() && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 2, sm: 4, md: 6 }}
              alignItems="flex-start"
              sx={{
                borderTop: 1,
                borderColor: "divider",
                paddingTop: 2,
                marginTop: 2,
              }}
            >
              <Responses data={summary.responses}></Responses>
              {chartReady && (
                <Chart
                  data={{ ...summary.chartConfig, data: summary.chartData }}
                ></Chart>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </div>
  );
}
