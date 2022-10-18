import { useState, useEffect, useRef, useReducer, useContext } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
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
} from "../util/util";
import {
 // NO_CACHE_HEADER,
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
} from "../consts/consts";
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
  const { questionnaireId, callbackFunc } = props;
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
  const [questionnaireTitle, setQuestionnaireTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasChart, setHasChart] = useState(false);
  const [error, setError] = useState("");
  const anchorElementStyle = {
    position: "relative",
    top: -64,
    height: 2,
    width: 2,
  };
  const shouldDisplayResponses = () => !loading && !error;

  const formatChartData = (data) => {
    if (summary.chartConfig && summary.chartConfig.dataFormatter)
      return summary.chartConfig.dataFormatter(data);
    return data;
  };

  const getAnchorElementId = () => QUESTIONNAIRE_ANCHOR_ID_PREFIX;
  const hasResponses = () => summary.responses && summary.responses.length > 0;

  const renderLoader = () =>
    loading && (
      <Stack
        alignItems={"center"}
        direction="row"
        justifyContent={"flex-start"}
        spacing={2}
      >
        <LinearProgress sx={{ width: "300px", marginTop: 6 }}></LinearProgress>
      </Stack>
    );
  const renderError = () =>
    error && (
      <Box sx={{ marginBottom: 1 }}>
        <Error message={error}></Error>
      </Box>
    );
  const renderAnchor = () => (
    <div
      id={`${getAnchorElementId()}_${questionnaireId.toLowerCase()}`}
      style={anchorElementStyle}
    ></div>
  );
  const getQuestionnaireTitle = () => {
    if (questionnaireTitle) return questionnaireTitle;;
    return getDisplayQTitle(questionnaireId);
  };
  const renderTitle = () => (
    <Typography
      variant="h6"
      component="h3"
      color="secondary"
      sx={{ marginBottom: 2 }}
    >
      {getQuestionnaireTitle()}
    </Typography>
  );
  const renderSummary = () =>
    shouldDisplayResponses() && (
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

        {!hasResponses() && (
          <Alert severity="warning">No recorded responses</Alert>
        )}
        {hasResponses() && <Responses data={summary.responses}></Responses>}
      </Stack>
    );

  useEffect(() => {
    if (!loading) return;

    // Define a web worker for evaluating CQL expressions
    const cqlWorker = new Worker();

    // search for matching questionnaire
    const searchMatchingResources = async () => {
      const fhirSearchOptions = { pageLimit: 0 };
      const requests = [
        "Questionnaire?name:contains=" + questionnaireId,
        "QuestionnaireResponse?questionnaire:contains=" + questionnaireId,
      ].map((uri) =>
        client.request(
          {
            url: uri
           // ...NO_CACHE_HEADER,
          },
          fhirSearchOptions
        )
      );
      return Promise.all(requests).catch(e => {
        throw new Error(e);
      });
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
        setError(e);
        setLoading(false);
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
      // get formatted chart data
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
    // find matching questionnaire & questionnaire response(s)
    searchMatchingResources()
      .then((results) => {
        let bundles = [];
        console.log(`${questionnaireId} search results `, results);
        results.forEach((entry) => {
          entry.forEach((item) => {
            if (!item.entry || !item.entry.length) return true;
            item.entry.forEach((o) => {
              if (!o.resource) return true;
              bundles.push({
                resource: o.resource,
              })
            });
          });
        });
        const arrQuestionnaires = bundles.filter(
          (entry) =>
            entry.resource && String(entry.resource.resourceType).toLowerCase() ===
            "questionnaire"
        );
        const questionnaireJson = arrQuestionnaires.length
          ? arrQuestionnaires[0].resource
          : null;
        if (!questionnaireJson) {
          callback(callbackFunc, { status: "error" });
          setLoading(false);
          setError("No matching questionnaire found");
          return;
        }
        setQuestionnaireTitle(questionnaireJson.title);
        patientBundle.current = {
          ...patientBundle.current,
          entry: [...patientBundle.current.entry, ...bundles],
          questionnaire: questionnaireJson,
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
      })
      .catch((e) => {
        setError(e.message ? e.message : e);
        setLoading(false);
        callback(callbackFunc, { status: "error" });
      });

    return () => cqlWorker.terminate();
  }, [client, questionnaireId, loading, callbackFunc]);

  return (
    <>
      {/* anchor element */}
      {renderAnchor()}
      <Stack
        className="summary"
        id={`summary_${questionnaireId}`}
        direction="column"
        sx= {{
          paddingTop: 2,
          paddingBottom: 4
        }}
      >
        {/* questionnaire title */}
        {renderTitle()}
        {/* error message */}
        {renderError()}
        {/* loading indicator */}
        {renderLoader()}
        {/* chart & responses */}
        {renderSummary()}
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
};
