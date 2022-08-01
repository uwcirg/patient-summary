import {
  useCallback,
  useState,
  useEffect,
  useContext,
  useReducer,
} from "react";
import PropTypes from "prop-types";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import { initialzieCqlWorker } from "cql-worker";
import { FhirClientContext } from "../FhirClientContext";
import Error from "./Error";
import {
  getFHIRResourcePaths,
  getInterventionLogicLib,
  getChartConfig,
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
} from "../util/util";
import Responses from "./Responses";
import Chart from "./Chart";

export default function Summary(props) {
  const { client, patient } = useContext(FhirClientContext);
  const { questionnaire, callbackFunc } = props;
  const summaryReducer = (summary, action) => {
    if (action.type === "reset") {
      return {
        responses: [],
        chartConfig: [],
        chartData: [],
      };
    }
    if (action.type === "update") {
      return action.payload;
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
  const [fhirData, setFhirData] = useState(null);
  const [patientBundle, setPatientBundle] = useState({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [{ resource: patient }],
  });
  const shouldDisplayResponses = () =>
    ready && questionnaire && questionnaire.length > 0;
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

  const formatChartData = (data) => {
    if (summary.chartConfig && summary.chartConfig.dataFormatter)
      return summary.chartConfig.dataFormatter(data);
    return data;
  };

  const patientBundleLoaded = useCallback(() => {
    return (
      patientBundle && patientBundle.entry && patientBundle.entry.length > 1
    );
  }, [patientBundle]);

  useEffect(() => {
    if (fhirData && fhirData.length) return;
    const gatherPatientData = async () => {
      if (patientBundleLoaded()) return;
      /* get FHIR resources */
      const dataResult = await getFhirResources().catch((e) => setError(e));
      setPatientBundle((prevPatientBundle) => {
        return {
          ...prevPatientBundle,
          entry: [...prevPatientBundle.entry, ...dataResult],
        };
      });
      setFhirData(dataResult);
    };
    gatherPatientData();
  }, [getFhirResources, patientBundleLoaded, fhirData]);

  const callback = useCallback((obj) => {
    if (callbackFunc) callbackFunc(obj);
  }, [callbackFunc]);

  useEffect(() => {
    if (error) {
      callback({ status: "error" });
      setReady(true);
    }
    if (!fhirData || !fhirData.length) {
      return;
    }
    // Define a web worker for evaluating CQL expressions
    const cqlWorker = new Worker();
    // Initialize the cql-worker
    const [setupExecution, sendPatientBundle, evaluateExpression] =
      initialzieCqlWorker(cqlWorker);
    const gatherSummaryData = async () => {
      const chartConfig = getChartConfig(questionnaire);
      /* get CQL expressions */
      const [elmJson, valueSetJson] = await getInterventionLogicLib(
        questionnaire
      ).catch((e) => setError(e));
      // Send the cqlWorker an initial message containing the ELM JSON representation of the CQL expressions
      setupExecution(elmJson, valueSetJson);
      // Send patient info to CQL worker to process
      sendPatientBundle(patientBundle);
      // get formatted questionnaire responses
      const cqlData = await evaluateExpression("ResponsesSummary").catch((e) =>
        setError(e)
      );
      let chartData = null;
      chartData = await evaluateExpression("ChartData").catch((e) =>
        setError(e)
      );
      const returnResult = {
        chartConfig: chartConfig,
        chartData: chartData || [],
        responses: cqlData || [],
      };
      console.log("return result ", returnResult);
      return returnResult;
    };
    gatherSummaryData()
      .then((data) => {
        dispatch({ type: "update", payload: data });
        setReady(true);
        setChartReady(data.chartData ? true : false);
        callback({ status: "ok" });
      })
      .catch((e) => setError(e));
    return () => cqlWorker.terminate();
  }, [
    error,
    questionnaire,
    patientBundle,
    fhirData,
    callback,
  ]);

  return (
    <>
      <div
        id={`${QUESTIONNAIRE_ANCHOR_ID_PREFIX}_${questionnaire}`}
        style={{ position: "relative", top: -64, height: 2, width: 2 }}
      ></div>
      <Stack
        className="summary"
        id={`summary_${questionnaire}`}
        sx={{
          borderTop: 1,
          borderColor: "divider",
          paddingTop: 2,
          paddingBottom: 2,
          marginTop: 3,
        }}
        direction="column"
      >
        <Typography
          variant="h6"
          component="h3"
          color="secondary"
          sx={{ marginBottom: 1 }}
        >
          {questionnaire}
        </Typography>
        {error && <Error message={error}></Error>}
        {!error && !ready && (
          <Stack
            alignItems={"center"}
            direction="row"
            justifyContent={"flex-start"}
            spacing={2}
          >
            <LinearProgress
              sx={{ width: "300px", marginTop: 6 }}
            ></LinearProgress>
          </Stack>
        )}
        {!error && shouldDisplayResponses() && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2, md: 6 }}
            alignItems="flex-start"
          >
            {chartReady && (
              <Chart
                type={summary.chartConfig.type}
                data={{
                  ...summary.chartConfig,
                  data: formatChartData(summary.chartData),
                }}
              ></Chart>
            )}
            <Responses data={summary.responses}></Responses>
          </Stack>
        )}
      </Stack>
    </>
  );
}
Summary.propTypes = {
  questionnaire: PropTypes.string.isRequired,
  callbackFunc: PropTypes.func,
};
