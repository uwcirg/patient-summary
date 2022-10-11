import { useState, useEffect, useRef, useReducer, useContext } from "react";
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
  getDisplayQTitle,
  hasData,
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
} from "../util/util";
import Responses from "./Responses";
import Chart from "./Chart";
import config from "../config/questionnaire_config";
import { FhirClientContext } from "../context/FhirClientContext";

export default function Summary(props) {
  const { client } = useContext(FhirClientContext);
  const patientBundle = useRef({
    resourceType: "Bundle",
    id: "resource-bundle",
    type: "collection",
    entry: [...props.patientBundle.entry],
    questionnaire: null,
  });
  const { questionnaireId, callbackFunc, sectionAnchorPrefix } = props;
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
  const anchorElementStyle = {
    position: "relative",
    top: -64,
    height: 2,
    width: 2,
  };
  const shouldDisplayResponses = () =>
    !loading && !error && hasData(questionnaireId);

  const formatChartData = (data) => {
    if (summary.chartConfig && summary.chartConfig.dataFormatter)
      return summary.chartConfig.dataFormatter(data);
    return data;
  };

  const getAnchorElementId = () =>
    sectionAnchorPrefix || QUESTIONNAIRE_ANCHOR_ID_PREFIX;

  useEffect(() => {
    if (!loading) return;

    // Define a web worker for evaluating CQL expressions
    const cqlWorker = new Worker();

    // search for matching questionnaire
    const searchMatchingQuestionnaire = async () => {
      const nameSearchString = questionnaireId.split("-").join(",");
      return Promise.all([
        // look up the questionnaire based on whether the id or the name attribute matches the specified instrument id?
        client.request("/Questionnaire/?_id=" + questionnaireId),
        client.request("/Questionnaire?name:contains=" + nameSearchString),
      ]);
    };

    const gatherSummaryData = async (questionnaireJson) => {
      // Initialize the cql-worker
      const [setupExecution, sendPatientBundle, evaluateExpression] =
        initialzieCqlWorker(cqlWorker);
      const questionaireKey = getDisplayQTitle(questionnaireId).toLowerCase();
      const chartConfig = getChartConfig(questionaireKey);
      const questionnaireConfig = config[questionaireKey] || {};

      /* get CQL expressions */
      const [elmJson, valueSetJson] = await getInterventionLogicLib(
        questionnaireConfig.customCQL ? questionnaireId : ""
      ).catch((e) => {
        throw new Error(e);
      });

      setupExecution(elmJson, valueSetJson, {
        QuestionnaireName: questionnaireJson.name,
        QuestionnaireURL: questionnaireJson.url,
        ScoringQuestionId: questionnaireConfig.scoringQuestionId,
      });

      // Send patient info to CQL worker to process
      sendPatientBundle(patientBundle.current);

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
      console.log("return result from CQL execution ", returnResult);
      return returnResult;
    };
    searchMatchingQuestionnaire().then((results) => {
      let questionnaireJson;
      const qResults =
        results && results.length
          ? results.filter((q) => q.entry && q.entry.length > 0)
          : [];
      if (qResults.length) {
        questionnaireJson = qResults[0].entry[0].resource;
      }
      if (!questionnaireJson) {
        callback(callbackFunc, { status: "error" });
        setLoading(false);
        setError("No matching questionnaire found");
        return;
      }
      patientBundle.current = {
        ...patientBundle.current,
        entry: [
          ...patientBundle.current.entry,
          {
            resource: questionnaireJson,
          },
        ],
      };
      gatherSummaryData(questionnaireJson)
        .then((data) => {
          dispatch({ type: "update", payload: data });
          setLoading(false);
          setHasChart(hasData(data.chartData));
          callback(callbackFunc, { status: "ok" });
        })
        .catch((e) => {
          setError(e.message ? e.message : e);
          setLoading(false);
          callback(callbackFunc, { status: "error" });
        });
    });

    return () => cqlWorker.terminate();
  }, [client, questionnaireId, loading, callbackFunc]);

  return (
    <>
      {/* anchor element */}
      <div
        id={`${getAnchorElementId()}_${questionnaireId}`}
        style={anchorElementStyle}
      ></div>
      <Stack
        className="summary"
        id={`summary_${questionnaireId}`}
        sx={{
          paddingTop: 2,
          paddingBottom: 2,
        }}
        direction="column"
      >
        {/* questionnaire title */}
        <Typography
          variant="h6"
          component="h3"
          color="secondary"
          sx={{ marginBottom: 1 }}
        >
          {getDisplayQTitle(questionnaireId)}
        </Typography>
        {/* error message */}
        {error && (
          <Box sx={{ marginBottom: 1 }}>
            <Error message={error}></Error>
          </Box>
        )}
        {/* loading indicator */}
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
        {/* chart & responses */}
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
  questionnaireId: PropTypes.string.isRequired,
  patientBundle: PropTypes.shape({
    resourceType: PropTypes.string,
    id: PropTypes.string,
    type: PropTypes.string,
    entry: PropTypes.array.isRequired,
  }),
  callbackFunc: PropTypes.func,
  sectionAnchorPrefix: PropTypes.string,
};
