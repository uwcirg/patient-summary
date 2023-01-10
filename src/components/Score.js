import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ErrorIcon from "@mui/icons-material/Error";
import { isNumber } from "../util/util";

export default function Scoring(props) {
  const { score, justifyContent, alignItems, scoreParams } = props;
  const scoreSeverity =
    scoreParams && scoreParams.scoreSeverity
      ? String(scoreParams.scoreSeverity).toLowerCase()
      : null;
  const arrSeverityLevelToAlert = ["high"];
  const getScoreDisplay = () => (isNumber(score) ? score : "--");
  const alertNote =
    scoreParams && scoreParams.alertNote ? scoreParams.alertNote : null;

  // display alert icon for score that has high severity  
  if (arrSeverityLevelToAlert.indexOf(scoreSeverity) !== -1) {
    const iconColor = scoreSeverity === "high" ? "error" : "inherit";
    const textColor = scoreSeverity === "high" ? "error.main" : "inherit";
    return (
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent={justifyContent || "flex-start"}
        alignItems={alignItems || "center"}
      >
        <Typography variant="body1" color={textColor}>
          {getScoreDisplay()}
        </Typography>
        {alertNote && (
          <Tooltip title={alertNote} placement="top" arrow>
            <ErrorIcon color={iconColor} fontSize="small"></ErrorIcon>
          </Tooltip>
        )}
        {!alertNote && (
          <ErrorIcon color={iconColor} fontSize="small"></ErrorIcon>
        )}
      </Stack>
    );
  }

  return (
    <Typography variant="body1" color="secondary">
      {getScoreDisplay()}
    </Typography>
  );
}

Scoring.propTypes = {
  instrumentId: PropTypes.string,
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  scoreParams: PropTypes.object,
  justifyContent: PropTypes.string,
  alignItems: PropTypes.string,
};
