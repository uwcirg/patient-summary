import React, { useEffect, useReducer } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Questionnaire from "@models/Questionnaire";
import { hasData, isEmptyArray } from "@util";
import Error from "./ErrorComponent";
import QuestionnaireInfo from "./QuestionnaireInfo";
import Responses from "./Responses";
import Chart from "./Chart";
import { QUESTIONNAIRE_ANCHOR_ID_PREFIX } from "@/consts";

export default function Summary(props) {
  const { questionnaireId, data } = props;
  const summaryReducer = (summary, action) => {
    if (action.type === "reset") {
      return {
        responses: [],
        chartConfig: [],
        chartData: [],
        error: "",
        loading: false,
      };
    }
    if (action.type === "update") {
      return {
        ...action.payload,
        loading: false,
      };
    }
    if (action.type === "error") {
      return {
        ...summary,
        loading: false,
        [action.type]: action.payload,
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
    error: "",
    loading: true,
  });
  const hasChart = hasData(summary.chartData);
  const anchorElementStyle = {
    position: "relative",
    top: -64,
    height: 2,
    width: 2,
  };
  const shouldDisplayResponses = () => !summary || (summary && !summary.loading && !summary.error);
  const getAnchorElementId = () => QUESTIONNAIRE_ANCHOR_ID_PREFIX;
  const hasResponses = () => !isEmptyArray(summary.responseData);

  const renderLoader = () =>
    summary.loading && (
      <Stack alignItems={"center"} direction="row" justifyContent={"flex-start"} spacing={2}>
        <LinearProgress sx={{ width: "300px", marginTop: 6, paddingLeft: 4, paddingRight: 4 }}></LinearProgress>
      </Stack>
    );
  const renderError = () =>
    summary &&
    !!summary.error && (
      <Box sx={{ marginBottom: 1 }}>
        <Error message={summary.error}></Error>
      </Box>
    );
  const renderAnchor = () => <div id={`${getAnchorElementId()}_${questionnaireId}`} style={anchorElementStyle}></div>;
  const renderTitle = () => {
    let questionnaireTitle = questionnaireId;
    const qo = new Questionnaire(data?.questionnaire, questionnaireId);
    questionnaireTitle = qo.displayName;
    return (
      <Typography variant="h6" component="h3" color="accent" sx={{ marginBottom: 1 }} className="questionnaire-title">
        {questionnaireTitle}
      </Typography>
    );
  };
  const renderSummary = () => {
    if (!shouldDisplayResponses()) return null;
    return (
      <Stack direction="column" spacing={1} alignItems="flex-start" className="response-summary" flexWrap={"wrap"}>
        {hasChart && <Chart type={summary.chartType} data={summary.chartData}></Chart>}
        {!hasResponses() && <Alert severity="warning">No recorded responses</Alert>}
        {hasResponses() && (
          <Responses
            //data={summary.responseData}
            data={summary}
            questionnaireId={questionnaireId}
            questionnaireJson={summary.questionnaire}
          ></Responses>
        )}
      </Stack>
    );
  };

  const renderAlert = () => <Alert severity="warning">No summary data</Alert>

  useEffect(() => {
    if (!data || !summary.loading) return;
    if (data && data.error) {
      dispatch({
        type: "error",
        payload: data.error,
      });
      return;
    }
    dispatch({ type: "update", payload: data });
  }, [data, summary.loading]);

  return (
    <>
      {/* anchor element */}
      {renderAnchor()}
      <Stack
        className="summary"
        id={`summary_${questionnaireId}`}
        direction="column"
        sx={{
          paddingBottom: 4,
          paddingLeft: (theme) => theme.spacing(2),
          paddingRight: (theme) => theme.spacing(2),
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          {/* questionnaire title */}
          <div>{renderTitle()}</div>
          <QuestionnaireInfo questionnaireJson={data?.questionnaire}></QuestionnaireInfo>
        </Stack>
        {!data && renderAlert()}
        {data && (
          <>
            {/* error message */}
            {renderError()}
            {/* loading indicator */}
            {renderLoader()}
            {/* chart & responses */}
            {renderSummary()}
          </>
        )}
      </Stack>
    </>
  );
}
Summary.propTypes = {
  questionnaireId: PropTypes.string.isRequired,
  patientBundle: PropTypes.object,
  data: PropTypes.object,
};
