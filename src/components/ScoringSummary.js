import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import Scoring from "./Score";
import qConfig from "../config/questionnaire_config";
import { instrumentNameMaps } from "../consts/consts";
import { scrollToAnchor } from "../util/util";

export default function ScoringSummary(props) {
  const theme = useTheme();
  const { list, responses } = props;
  const hasList = () =>
    list &&
    list.length &&
    list.filter((id) => getScoringQuestionId(id)).length > 0;
  const getMatchResponsesById = (id) => {
    if (!responses) return [];
    const matchedResponses = responses
      .filter(
        (item) =>
          item.resource &&
          String(item.resource.questionnaire).toLowerCase().indexOf(id) !== -1
      )
      .map((item) => item.resource);
    return matchedResponses.sort(
      (a, b) => new Date(b.authored).getTime() - new Date(a.authored).getTime()
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
    const responseItems = matchedResponses[1].item;
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
    const comparisonToAlert = qConfig[id].comparisonToAlert;
    const currentScore = parseInt(getCurrentScoreByInstrument(id));
    const prevScore = parseInt(getPrevScoreByInstrument(id));
    if (isNaN(prevScore) || isNaN(currentScore)) return "--";
    if (!isNaN(prevScore)) {
      if (comparisonToAlert === "low") {
        if (currentScore < prevScore)
          return <SouthIcon color="error"></SouthIcon>;
        if (currentScore > prevScore)
          return <NorthIcon color="success"></NorthIcon>;
        return <HorizontalRuleIcon></HorizontalRuleIcon>;
      } else {
        if (currentScore > prevScore)
          return <NorthIcon color="error"></NorthIcon>;
        if (currentScore < prevScore)
          return <SouthIcon color="success"></SouthIcon>;
        return <HorizontalRuleIcon></HorizontalRuleIcon>;
      }
    } else {
      if (!isNaN(currentScore))
        return <HorizontalRuleIcon color="info"></HorizontalRuleIcon>;
      return null;
    }
  };
  const handleClick = (e, anchorElementId) => {
    e.preventDefault();
    scrollToAnchor(anchorElementId);
  }
  const renderTitle = () => (
    <Typography
      variant="h6"
      component="h3"
      color="accent"
      sx={{ padding: 1, marginLeft: 1, marginTop: 1, marginBottom: 1 }}
    >
      Scoring Summary
    </Typography>
  );
  const renderSummary = () =>
    hasList() && (
      <TableContainer sx={{ padding: 2, paddingTop: 0, marginBottom: 1 }}>
        <Table
          sx={{ border: "1px solid #ececec" }}
          size="small"
          aria-label="scoring summary table"
        >
          <TableHead>
            <TableRow>
              <TableCell size="small"></TableCell>
              <TableCell variant="body" size="small">
                Score
              </TableCell>
              <TableCell variant="body" size="small">
                Compared to Last
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map((item, index) => (
              <TableRow key={`{summary_${index}}`}>
                <TableCell sx={{ fontWeight: 500 }} size="small">
                  <Link onClick={(e) => handleClick(e, item)} underline="none" sx={{color: theme.palette.link.main, cursor: "pointer"}}>
                    {getInstrumentName(item)}
                  </Link>
                </TableCell>
                <TableCell align="left" size="small">
                  <Scoring
                    instrumentId={item}
                    score={getCurrentScoreByInstrument(item)}
                    justifyContent="space-between"
                  ></Scoring>
                </TableCell>
                <TableCell align="center" size="small">
                  {getDisplayIcon(item)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  return (
    <Paper sx={{ minWidth: "50%" }}>
      {renderTitle()}
      {renderSummary()}
    </Paper>
  );
}

ScoringSummary.propTypes = {
  list: PropTypes.array,
  responses: PropTypes.array,
};
