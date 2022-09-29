import { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Worker from "cql-worker/src/cql.worker.js"; // https://github.com/webpack-contrib/worker-loader
import { initialzieCqlWorker } from "cql-worker";
import Error from "./ErrorComponent";
import {
  callback,
  getInterventionLogicLib,
  getChartConfig,
  hasData,
  hasMatchedQuestionnaireFhirResource,
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
} from "../util/util";
import Responses from "./Responses";
import Chart from "./Chart";

export default function Summary(props) {
  const { questionnaire, patientBundle, callbackFunc, sectionAnchorPrefix } =
    props;
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
  const [loading, setLoading] = useState(true);
  const [hasChart, setHasChart] = useState(false);
  const [error, setError] = useState("");
  const shouldDisplayResponses = () => !loading && !error && hasData(questionnaire);

  const formatChartData = (data) => {
    if (summary.chartConfig && summary.chartConfig.dataFormatter)
      return summary.chartConfig.dataFormatter(data);
    return data;
  };

  useEffect(() => {
    if (!loading) return;
    if (!hasMatchedQuestionnaireFhirResource(patientBundle, questionnaire)) {
      setError(
        "No matching questionnaire found in FHIR server."
      );
      callback(callbackFunc, { status: "error" });
      setLoading(false);
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
      ).catch((e) => {
        throw new Error(e);
      });
      // Send the cqlWorker an initial message containing the ELM JSON representation of the CQL expressions
      setupExecution(elmJson, valueSetJson);
      // Send patient info to CQL worker to process
      sendPatientBundle(patientBundle);

      // get formatted questionnaire responses
      const cqlData = await evaluateExpression("ResponsesSummary").catch(
        (e) => {
          throw new Error(e);
        }
      );
      const chartData = await evaluateExpression("ChartData").catch((e) => {
        throw new Error(e);
      });
      const returnResult = {
        chartConfig: chartConfig,
        chartData: chartData,
        responses: cqlData,
      };
      console.log("return result ", returnResult);
      return returnResult;
    };
    gatherSummaryData()
      .then((data) => {
        dispatch({ type: "update", payload: data });
        setLoading(false);
        setHasChart(hasData(data.chartData));
        callback(callbackFunc, { status: "ok" });
      })
      .catch((e) => {
        setError(e.message ? e.message: e);
        setLoading(true);
        callback(callbackFunc, { status: "error" });
      });
    return () => cqlWorker.terminate();
  }, [questionnaire, patientBundle, loading, callbackFunc]);

  return (
    <>
      <div
        id={`${
          sectionAnchorPrefix || QUESTIONNAIRE_ANCHOR_ID_PREFIX
        }_${questionnaire}`}
        style={{ position: "relative", top: -64, height: 2, width: 2 }}
      ></div>
      <Stack
        className="summary"
        id={`summary_${questionnaire}`}
        sx={{
          paddingTop: 2,
          paddingBottom: 2,
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
        {error && (
          <Box sx={{ marginBottom: 1 }}>
            <Error message={error}></Error>
          </Box>
        )}
        {loading && (
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
        {shouldDisplayResponses() && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 2, md: 6 }}
            alignItems="flex-start"
          >
            {hasChart && (
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
  patientBundle: PropTypes.shape({
    resourceType: PropTypes.string,
    id: PropTypes.string,
    type: PropTypes.string,
    entry: PropTypes.array.isRequired,
  }),
  callbackFunc: PropTypes.func,
  sectionAnchorPrefix: PropTypes.string,
};
