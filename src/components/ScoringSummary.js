import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";

import qConfig from "../config/questionnaire_config";
import { instrumentNameMaps } from "../consts/consts";

export default function ScoringSummary(props) {
  const { list, responses } = props;
  const hasList = () => list && list.length;
  const getMatchResponsesById = (id) => {
    const matchedResponses = responses
      .filter(
        (item) =>
          item.resource &&
          String(item.resource.questionnaire).toLowerCase().indexOf(id) !== -1
      )
      .map((item) => item.resource);
    return matchedResponses
      .sort((a, b) => {
        return new Date(a.authored).getTime() - new Date(b.authored).getTime();
      })
      .sort(
        (a, b) =>
          new Date(a.meta.lastUpdated).getTime() -
          new Date(b.meta.lastUpdated).getTime()
      );
  };
  const getScoringQuestionId = (instrumentId) => {
    return qConfig[instrumentId].scoringQuestionId
      ? qConfig[instrumentId].scoringQuestionId
      : null;
  };
  const getInstrumentName = (id) =>
    instrumentNameMaps[id] ? instrumentNameMaps[id] : String(id).toUpperCase();

  const getPrevScoreByInstrument = (id) => {
    const matchedResponses = getMatchResponsesById(id);
    if (!matchedResponses.length || matchedResponses.length === 1) return null;
    const scoringQuestionId = getScoringQuestionId(id);
    if (!scoringQuestionId) return null;
    const responseItems = matchedResponses[matchedResponses.length - 1].item;
    if (!responseItems || !responseItems.length) return null;
    const matchedItem = responseItems
      .filter((item) => item.linkId === scoringQuestionId)
      .map((item) => item.answer[0].valueDecimal);
    return matchedItem.length ? matchedItem[0] : null;
  };

  const getCurrentScoreByInstrument = (id) => {
    const matchedResponses = getMatchResponsesById(id);
    if (!matchedResponses.length) return null;
    const scoringQuestionId = getScoringQuestionId(id);
    if (!scoringQuestionId) return null;
    const responseItems = matchedResponses[0].item;
    if (!responseItems || !responseItems.length) return null;
    const matchedItem = responseItems
      .filter((item) => item.linkId === scoringQuestionId)
      .map((item) => item.answer[0].valueDecimal);
    return matchedItem.length ? matchedItem[0] : null;
  };
  const getDisplayIcon = (id) => {
    const currentScore = parseInt(getCurrentScoreByInstrument(id));
    const prevScore = parseInt(getPrevScoreByInstrument(id));
    if (currentScore > prevScore) return <NorthIcon color="error"></NorthIcon>;
    if (currentScore < prevScore)
      return <SouthIcon color="success"></SouthIcon>;
    if (!prevScore && !isNaN(currentScore))
      return <HorizontalRuleIcon color="info"></HorizontalRuleIcon>;
    return null;
  };
  const renderTitle = () => (
    <Typography
      variant="h6"
      component="h3"
      color="accent"
      sx={{ marginBottom: 1, padding: 1 }}
    >
      Scoring Summary
    </Typography>
  );
  const renderSummary = () =>
    hasList() && (
      <TableContainer component={Paper}>
        <Table
          sx={{ minWidth: 650 }}
          size="small"
          aria-label="scoring summary table"
        >
          <TableBody>
            {list.map((item, index) => (
              <TableRow key={`{summary_${index}}`}>
                <TableCell sx={{ fontWeight: 500 }}>
                  {getInstrumentName(item)}
                </TableCell>
                <TableCell>
                  {getCurrentScoreByInstrument(item) || "--"}
                </TableCell>
                <TableCell>{getDisplayIcon(item)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  return (
    <Box>
      {renderTitle()}
      {renderSummary()}
    </Box>
  );
}

ScoringSummary.propTypes = {
  list: PropTypes.array,
  responses: PropTypes.array,
};
