import PropTypes from "prop-types";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ErrorIcon from "@mui/icons-material/Error";
import qConfig from "../config/questionnaire_config";

export default function Scoring(props) {
  const { instrumentId, score, justifyContent, alignItems, scoreParams } =
    props;
  const getFailedScoringByInstrumentId = (instrumentId) => {
    // TODO pass in patient education level to accurately determine what the fail score is
    return qConfig[instrumentId] && qConfig[instrumentId].failedScores
      ? qConfig[instrumentId].failedScores(scoreParams)
      : [];
  };
  const arrFailedScores = getFailedScoringByInstrumentId(instrumentId);

  if (arrFailedScores.indexOf(parseInt(score)) !== -1)
    return (
      <Stack
        direction="row"
        spacing={0.5}
        justifyContent={justifyContent || "flex-start"}
        alignItems={alignItems || "center"}
      >
        <Typography variant="body1" color="error">
          {score}
        </Typography>
        <ErrorIcon color="error" fontSize="small"></ErrorIcon>
      </Stack>
    );

  return (
    <Typography variant="body1" color="secondary">
      {!isNaN(score) && score !== null ? score : "--"}
    </Typography>
  );
}

Scoring.propTypes = {
  instrumentId: PropTypes.string,
  score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  scoreParams: PropTypes.object,
  justifyContent: PropTypes.string,
  alignItems: PropTypes.string
};
