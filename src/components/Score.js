import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/ReportProblem";
import { isNumber } from "../util/util";

export default function Scoring(props) {
  const { score, justifyContent, alignItems, scoreParams } = props;
  const scoreSeverity =
    scoreParams && scoreParams.scoreSeverity
      ? String(scoreParams.scoreSeverity).toLowerCase()
      : null;
  const arrSeverityLevelToAlert = ["high", "moderate", "moderately high"];
  const getScoreDisplay = () => (
    <span data-testid="score">{isNumber(score) ? score : "--"}</span>
  );
  const alertNote =
    scoreParams && scoreParams.alertNote ? scoreParams.alertNote : null;
  const isHighAlert = scoreSeverity === "high";
  const isModerateAlert =
    scoreSeverity === "moderate" || scoreSeverity === "moderately high";

  // display alert icon for score that has high severity
  if (arrSeverityLevelToAlert.indexOf(scoreSeverity) !== -1) {
    const iconColor = isHighAlert
      ? "error"
      : isModerateAlert
      ? "warning"
      : "inherit";
    const textColor = isHighAlert
      ? "error.main"
      : isModerateAlert
      ? "warning.main"
      : "inherit";

    const iconClass = isHighAlert ? "alert-icon" : "";

    const renderIcon = () => {
      if (isHighAlert)
        return (
          <ErrorIcon
            color={iconColor}
            fontSize="small"
            className={iconClass}
          ></ErrorIcon>
        );
      return (
        <WarningIcon
          color={iconColor}
          fontSize="small"
          className={iconClass}
        ></WarningIcon>
      );
    };
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
            {renderIcon()}
          </Tooltip>
        )}
        {!alertNote && renderIcon()}
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
