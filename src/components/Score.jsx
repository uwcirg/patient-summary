import React from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/ReportProblem";
import { isNumber } from "../util/util";
import ScoreSeverity from "../models/ScoreSeverity";

export default function Scoring(props) {
  const { score, justifyContent, alignItems, scoreParams } = props;
  const getScoreSeverity = () =>
    scoreParams && scoreParams.scoreSeverity ? String(scoreParams.scoreSeverity).toLowerCase() : null;
  const getAlertNote = () => (scoreParams && scoreParams.alertNote ? scoreParams.alertNote : null);
  const scoreSeverity = getScoreSeverity();
  const oSeverity = new ScoreSeverity(scoreSeverity);
  const alertNote = getAlertNote();
  const getScoreDisplay = () => <span data-testid="score">{isNumber(score) ? score : "--"}</span>;

  // display alert icon for score that has high severity
  if (oSeverity.isInRange()) {
    const renderIcon = () => {
      if (oSeverity.isHigh())
        return (
          <ErrorIcon color={oSeverity.iconColorClass} fontSize="small" className={oSeverity.iconClass}></ErrorIcon>
        );
      return (
        <WarningIcon color={oSeverity.iconColorClass} fontSize="small" className={oSeverity.iconClass}></WarningIcon>
      );
    };
    return (
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent={justifyContent || "flex-start"}
        alignItems={alignItems || "center"}
      >
        <div className={`${oSeverity.textColorClass}`}>{getScoreDisplay()}</div>
        {alertNote && (
          <Tooltip title={alertNote} placement="top" arrow>
            {renderIcon()}
          </Tooltip>
        )}
        {!alertNote && renderIcon()}
      </Stack>
    );
  }

  return getScoreDisplay();
}

Scoring.propTypes = {
  instrumentId: PropTypes.string,
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  scoreParams: PropTypes.object,
  justifyContent: PropTypes.string,
  alignItems: PropTypes.string,
};
