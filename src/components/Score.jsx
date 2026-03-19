import React from "react";
import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import AlertIcon from "@mui/icons-material/ReportProblem";
import Score from "@models/Score";

export default function Scoring(props) {
  const { score, justifyContent, alignItems, scoreParams, instrumentId } = props;
  const oScore = new Score(score, scoreParams, instrumentId);

  if (oScore.isInRange()) {
    const renderIcon = () => (
      <AlertIcon color={oScore.iconColorClass} fontSize="small" className={oScore.iconClass} />
    );

    return (
      <Stack
        direction="row"
        spacing={1}
        justifyContent={justifyContent || "flex-start"}
        alignItems={alignItems || "center"}
        className="score-container"
      >
        <div className={oScore.textColorClass}>{oScore.displayValue}</div>
        {oScore.isHigh() && (
          oScore.alertNote
            ? (
              <Tooltip title={oScore.alertNote} placement="top" arrow>
                <span>{renderIcon()}</span>
              </Tooltip>
            )
            : renderIcon()
        )}
      </Stack>
    );
  }

  return oScore.displayValue;
}

Scoring.propTypes = {
  instrumentId: PropTypes.string,
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  scoreParams: PropTypes.object,
  justifyContent: PropTypes.string,
  alignItems: PropTypes.string,
};
