import React from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/ReportProblem";
import Score from "@models/Score";

export default function Scoring(props) {
  const { score, justifyContent, alignItems, scoreParams } = props;
  const oScore = new Score(score, scoreParams);
  const getScoreDisplay = () => oScore.displayValue;
  // display alert icon for score that has high severity
  if (oScore.isInRange()) {
    const renderIcon = () => {
      if (oScore.isHigh())
        return (
          <ErrorIcon color={oScore.iconColorClass} fontSize="small" className={oScore.iconClass}></ErrorIcon>
        );
      return (
        <WarningIcon color={oScore.iconColorClass} fontSize="small" className={oScore.iconClass}></WarningIcon>
      );
    };
    return (
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent={justifyContent || "flex-start"}
        alignItems={alignItems || "center"}
      >
        <div className={`${oScore.textColorClass}`}>{getScoreDisplay()}</div>
        {oScore.alertNote && (
          <Tooltip title={oScore.alertNote} placement="top" arrow>
            {renderIcon()}
          </Tooltip>
        )}
        {!oScore.alertNote && renderIcon()}
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
