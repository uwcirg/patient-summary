import {
  useCallback,
  useState,
  useEffect,
  useContext,
  useReducer,
} from "react";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import { initialzieCqlWorker } from "cql-worker";
import { FhirClientContext } from "../FhirClientContext";
import QuestionnaireSelector from "./QuestionnaireSelector";
import Error from "./Error";
import {
  getFHIRResourcePaths,
  getInterventionLogicLib,
  getChartConfig,
  getEnv
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
  const summaryReducer = (summary, action) => {
    if (action.type === "reset") {
      return {
        responses: [],
        chartConfig: [],
        chartData: [],
      };
    }
    return {
      ...summary,
      [action.type]: action.payload,
    };
  };
  const [summary, dispatch] = useReducer(summaryReducer, {
    responses: [],
    chartData: [],
    chartConfig: [],
  });
  const [ready, setReady] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState("");
  const [patientBundle, setPatientBundle] = useState({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [{ resource: patient }],
  });
  const getQuestionnaireList = () => {
    const configList = getEnv("REACT_APP_QUESTIONNAIRES");
    if (configList) return configList.split(",");
    return [];
  };
  const shouldDisplayResponses = () =>
    ready && questionnaire && questionnaire.length > 0;
  const handleSelectorChange = (event) => {
    const selectedQuestionnaire = event.target.value;
    if (!selectedQuestionnaire) {
      dispatch({ type: "reset" });
      setReady(true);
      setChartReady(false);
      return;
    }
    setReady(false);
    setChartReady(false);
    setQuestionnaire(selectedQuestionnaire);
    // get formatted summary for the selected questionnaire
    getCQLEvaluations(selectedQuestionnaire).then(
      (result) => {
        console.log("cql summary result ", result)
        // set formatted responses
        dispatch({
          type: "responses",
          payload: result && result.length ? result : [],
        });
        // set chart config
        dispatch({
          type: "chartConfig",
          payload: getChartConfig(selectedQuestionnaire),
        });
        // get chart data for the selected questionnaire
        getChartData().then(
          (chartData) => {
            console.log("chart data ", chartData)
            const hasChartData = chartData && chartData.length;
            dispatch({
              type: "chartData",
              payload: hasChartData ? chartData : [],
            });
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
            sx={{ width: "300px", marginTop: 8 }}
          ></LinearProgress>
        </div>
      )}
      {!error && ready && (
        <Stack>
          <QuestionnaireSelector
            title="View Summary By Questionnaire"
            list={getQuestionnaireList()}
            selected={questionnaire}
            handleSelectorChange={handleSelectorChange}
          ></QuestionnaireSelector>
          {shouldDisplayResponses() && (
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={{ xs: 2, md: 6 }}
              alignItems="flex-start"
              sx={{
                borderTop: 1,
                borderColor: "divider",
                paddingTop: 2,
                marginTop: 3,
              }}
            >
              <Responses data={summary.responses}></Responses>
              {chartReady && (
                <Chart
                  type={summary.chartConfig.type}
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
