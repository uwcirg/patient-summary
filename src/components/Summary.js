import { useState, useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Error from "./ErrorComponent";
import { getDisplayQTitle, hasData } from "../util/util";
import {
  // NO_CACHE_HEADER,
  QUESTIONNAIRE_ANCHOR_ID_PREFIX,
} from "../consts/consts";
import Responses from "./Responses";
import Chart from "./Chart";

export default function Summary(props) {
  const { questionnaireId, data } = props;
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
    if (questionnaireTitle) return questionnaireTitle;
    return getDisplayQTitle(questionnaireId);
  };
  const renderTitle = () => (
    <Typography
      variant="h6"
      component="h3"
      color="accent"
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
        {hasResponses() && (
          <Responses
            data={summary.responses}
            questionnaireId={questionnaireId}
          ></Responses>
        )}
      </Stack>
    );

  useEffect(() => {
    if (!loading) return;
    dispatch({ type: "update", payload: data });
    setHasChart(hasData(data ? data.chartData : null));
    if (data) {
      setQuestionnaireTitle(
        data.questionnaire && data.questionnaire.title
          ? data.questionnaire.title
          : ""
      );
      if (data.error) setError(data.error);
    }
    setLoading(false);
  }, [data, loading]);

  return (
    <>
      {/* anchor element */}
      {renderAnchor()}
      <Stack
        className="summary"
        id={`summary_${questionnaireId}`}
        direction="column"
        sx={{
          paddingTop: 2,
          paddingBottom: 4,
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
  patientBundle: PropTypes.object,
};
