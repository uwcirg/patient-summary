import React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Questionnaire from "@models/Questionnaire";
import { hasData } from "@util";
import Error from "./ErrorComponent";
import QuestionnaireInfo from "./QuestionnaireInfo";
import Chart from "./Chart";
import ScoringSummary from "./sections/ScoringSummary";
import { QUESTIONNAIRE_ANCHOR_ID_PREFIX } from "@/consts";

export default function Summary(props) {
  const { questionnaireId, data: summary } = props;
  const hasChart = hasData(summary?.chartData);
  const anchorElementStyle = {
    position: "relative",
    top: -64,
    height: 2,
    width: 2,
  };
  const shouldDisplayResponses = () => !summary || (summary && !summary.error);
  const getAnchorElementId = () => QUESTIONNAIRE_ANCHOR_ID_PREFIX;

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
    const qo = new Questionnaire(summary?.questionnaire, questionnaireId);
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
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        className="response-summary"
        flexWrap={{
          xs: "wrap",
          sm: "wrap",
          md: "nowrap",
        }}
      >
        <ScoringSummary
          data={summary}
          disableLinks={true}
          enableResponsesViewer={true}
          containerStyle={{ alignSelf: "stretch" }}
        ></ScoringSummary>
        {hasChart && (
          <Chart
            type={summary?.chartType}
            data={{
              ...(summary?.chartData ?? {}),
              title: "",
              lgChartWidth: 520,
              chartHeight: 220
            }}
          ></Chart>
        )}
      </Stack>
    );
  };

  const renderAlert = () => <Alert severity="warning">No summary data</Alert>;

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
          <div className="questionnaire-title-container">{renderTitle()}</div>
          <QuestionnaireInfo questionnaireJson={summary?.questionnaire}></QuestionnaireInfo>
        </Stack>
        {!summary && renderAlert()}
        {summary && (
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
