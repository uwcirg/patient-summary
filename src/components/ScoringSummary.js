import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
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
import { isNumber, scrollToAnchor } from "../util/util";

export default function ScoringSummary(props) {
  const theme = useTheme();
  const bgColor =
    theme &&
    theme.palette &&
    theme.palette.lightest &&
    theme.palette.lightest.main
      ? theme.palette.lightest.main
      : "#FFF";
  const linkColor =
    theme && theme.palette && theme.palette.link && theme.palette.link.main
      ? theme.palette.link.main
      : "blue";
  const { summaryData } = props;
  const responsesHasScore = (responses) => {
    if (!responses || !responses.length) return false;
    return (
      responses.filter(
        (result) => isNumber(result.score)
      ).length > 0
    );
  };
  const hasList = () =>
    summaryData &&
    Object.keys(summaryData).length > 0 &&
    Object.keys(summaryData).filter((key) => {
      return responsesHasScore(summaryData[key].responses);
    }).length > 0;
  const getSortedResponses = (rdata) => {
    if (!rdata || rdata.length === 0) return [];
    return rdata.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };
  const getCurrentResponses = (rdata) => {
    const sortedResponses = getSortedResponses(rdata);
    if (!sortedResponses || !sortedResponses.length) return null;
    return sortedResponses[0];
  };
  const getInstrumentShortName = (id) =>
    qConfig[id] && qConfig[id].shortTitle
      ? qConfig[id].shortTitle
      : String(id).toUpperCase();

  const getPrevScoreByInstrument = (rdata) => {
    const responses = getSortedResponses(rdata);
    if (!responses || !responses.length || responses.length === 1)
      return parseInt(null);
    if (!responses[1].date) return parseInt(null);
    return parseInt(responses[1].score);
  };

  const getCurrentScoreByInstrument = (rdata) => {
    const sortedResponses = getSortedResponses(rdata);
    if (!sortedResponses || !sortedResponses.length) return parseInt(null);
    if (!sortedResponses[0].date) return parseInt(null);
    return parseInt(sortedResponses[0].score);
  };
  const getDisplayIcon = (id, rdata) => {
    const comparisonToAlert = qConfig[id] && qConfig[id].comparisonToAlert;
    const currentScore = getCurrentScoreByInstrument(rdata);
    const prevScore = getPrevScoreByInstrument(rdata);
    //console.log("current score ", currentScore, " prev score ", prevScore);
    if (isNaN(prevScore) || isNaN(currentScore)) return "--";
    if (!isNaN(prevScore)) {
      if (comparisonToAlert === "lower") {
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
  };
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

  const getResponsesContainingScore = () => {
    if (!hasList()) return [];
    return Object.keys(summaryData).filter((key) => {
      return responsesHasScore(summaryData[key].responses);
    });
  };

  const scoreList = getResponsesContainingScore();

  const renderSummary = () => {
    if (!hasList())
      return (
        <Alert severity="warning" sx={{ margin: 1 }}>
          No summary available
        </Alert>
      );
    return (
      <TableContainer sx={{ padding: 2, paddingTop: 0, marginBottom: 1 }}>
        <Table
          sx={{ border: "1px solid #ececec" }}
          size="small"
          aria-label="scoring summary table"
          className="scoring-summary-table"
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: bgColor }}>
              <TableCell size="small"></TableCell>
              <TableCell variant="head" size="small">
                Score
              </TableCell>
              <TableCell variant="head" size="small">
                Compared to Last
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scoreList.map((key, index) => (
              <TableRow key={`{summary_${index}}`}>
                <TableCell sx={{ fontWeight: 500 }} size="small">
                  <Link
                    onClick={(e) => handleClick(e, key)}
                    underline="none"
                    sx={{ color: linkColor, cursor: "pointer" }}
                  >
                    {getInstrumentShortName(key)}
                  </Link>
                </TableCell>
                <TableCell align="left" size="small">
                  <Scoring
                    score={getCurrentScoreByInstrument(
                      summaryData[key].responses
                    )}
                    scoreParams={getCurrentResponses(
                      summaryData[key].responses
                    )}
                    justifyContent="space-between"
                  ></Scoring>
                </TableCell>
                <TableCell align="center" size="small">
                  {getDisplayIcon(key, summaryData[key].responses)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Paper className="scoring-summary-container" sx={{ minWidth: "50%" }}>
      {renderTitle()}
      {renderSummary()}
    </Paper>
  );
}

ScoringSummary.propTypes = {
  summaryData: PropTypes.object,
};
