import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
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
  const borderColor =
    theme && theme.palette && theme.palette.border && theme.palette.border.main
      ? theme.palette.border.main
      : "#FFF";
  const { summaryData } = props;
  const responsesHasScore = (responses) => {
    if (!responses || !responses.length) return false;
    return responses.filter((result) => isNumber(result.score)).length > 0;
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
    const score = sortedResponses[0].score;
    return isNumber(score) ? score : "--";
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
          return <SouthIcon color="error" fontSize="small"></SouthIcon>;
        if (currentScore > prevScore)
          return <NorthIcon color="success" fontSize="small"></NorthIcon>;
        return <HorizontalRuleIcon fontSize="small"></HorizontalRuleIcon>;
      } else {
        if (currentScore > prevScore)
          return <NorthIcon color="error" fontSize="small"></NorthIcon>;
        if (currentScore < prevScore)
          return <SouthIcon color="success" fontSize="small"></SouthIcon>;
        return <HorizontalRuleIcon fontSize="small"></HorizontalRuleIcon>;
      }
    } else {
      if (!isNaN(currentScore))
        return (
          <HorizontalRuleIcon
            color="info"
            fontSize="small"
          ></HorizontalRuleIcon>
        );
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
      sx={{
        padding: {
          xs: theme.spacing(0, 1, 0),
          sm: theme.spacing(0.5, 1, 0.5),
        },
        marginLeft: 1,
        marginTop: 0.5,
      }}
    >
      Scoring Summary
    </Typography>
  );

  const getScoreList = () => {
    if (!hasList()) return [];
    return Object.keys(summaryData);
  };

  const getMostRecentEntry = (summaryData) => {
    if (!summaryData.responses || !summaryData.responses.length) return null;
    return summaryData.responses[0];
  };

  const displayScoreRange = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return null;
    const scoringParams = mostRecentEntry.scoringParams;
    if (!scoringParams) return null;
    if (!scoringParams.maximumScore) return null;
    const minScore = scoringParams.minimumScore
      ? scoringParams.minimumScore
      : 0;
    const maxScore = scoringParams.maximumScore;
    return `( ${minScore} - ${maxScore} )`;
  };

  const displayNumAnswered = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return null;
    const totalItems = mostRecentEntry.totalItems;
    const totalAnsweredItems = mostRecentEntry.totalAnsweredItems;
    if (!totalItems || !totalAnsweredItems) return null;
    return `${totalAnsweredItems} / ${totalItems}`;
  };

  const displayScoreMeaning = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return null;
    return mostRecentEntry.scoreMeaning;
  };

  const scoreList = getScoreList();
  const cellWhiteSpaceStyle = {
    whiteSpace: { xs: "nowrap", sm: "normal" },
    textOverflow: "ellipsis",
    overflow: "hidden",
  };
  const cellStyle = {
    borderRight: `1px solid ${borderColor}`,
    padding: {
      xs: theme.spacing(0.5, 1),
      sm: theme.spacing(0.5, 2),
    },
    ...cellWhiteSpaceStyle,
  };
  const fixedCellStyle = {
    ...cellStyle,
    ...{
      position: {
        xs: "absolute",
        sm: "inherit",
      },
      width: {
        xs: theme.spacing(29.75),
        sm: "auto",
      },
      minHeight: {
        xs: "34px",
        sm: "auto",
      },
      left: theme.spacing(1.75),
      ...cellWhiteSpaceStyle,
    },
  };
  const renderTableHeaderRow = () => (
    <TableHead>
      <TableRow sx={{ backgroundColor: bgColor }}>
        <TableCell
          size="small"
          sx={{
            ...fixedCellStyle,
            ...{
              minHeight: {
                xs: theme.spacing(4),
                sm: "auto",
              },
            },
          }}
        ></TableCell>
        <TableCell
          variant="head"
          size="small"
          sx={{ ...cellStyle, borderRightWidth: 0 }}
        >
          Score
        </TableCell>
        <TableCell sx={cellStyle}>{/* score range */}</TableCell>
        <TableCell align="center" size="small" sx={cellStyle}>
          # Answered
        </TableCell>
        <TableCell align="center" size="small" sx={cellStyle}>
          Meaning
        </TableCell>
        <TableCell
          variant="head"
          size="small"
          sx={{ ...cellStyle, borderRightWidth: 0 }}
        >
          Compared to Last
        </TableCell>
      </TableRow>
    </TableHead>
  );

  const renderInstrumentLinkCell = (key) => (
    <TableCell
      sx={{
        ...fixedCellStyle,
        ...{
          fontWeight: 500,
        },
      }}
      size="small"
    >
      <Link
        onClick={(e) => handleClick(e, key)}
        underline="none"
        sx={{ color: linkColor, cursor: "pointer" }}
      >
        {getInstrumentShortName(key)}
      </Link>
    </TableCell>
  );

  const renderScoreCell = (key) => (
    <TableCell
      align="left"
      size="small"
      className="score-cell"
      sx={{ ...cellStyle, borderRightWidth: 0 }}
    >
      <Scoring
        score={getCurrentScoreByInstrument(summaryData[key].responses)}
        scoreParams={getCurrentResponses(summaryData[key].responses)}
      ></Scoring>
    </TableCell>
  );

  const renderScoreRangeCell = (key) => (
    <TableCell align="left" size="small" sx={cellStyle}>
      <Box className="no-wrap-text muted-text">
        {displayScoreRange(summaryData[key])}
      </Box>
    </TableCell>
  );

  const renderNumAnsweredCell = (key) => (
    <TableCell align="center" size="small" sx={cellStyle}>
      {displayNumAnswered(summaryData[key])}
    </TableCell>
  );

  const renderScoreMeaningCell = (key) => (
    <TableCell
      align="center"
      size="small"
      className="capitalized-text"
      sx={cellStyle}
    >
      {displayScoreMeaning(summaryData[key])}
    </TableCell>
  );

  const renderComparedToLastCell = (key) => (
    <TableCell
      align="center"
      size="small"
      sx={{ ...cellStyle, borderRightWidth: 0 }}
    >
      {getDisplayIcon(key, summaryData[key].responses)}
    </TableCell>
  );

  const renderTableBody = () => {
    return (
      <TableBody>
        {scoreList.map((key, index) => (
          <TableRow key={`{summary_${index}}`}>
            {renderInstrumentLinkCell(key)}
            {renderScoreCell(key)}
            {renderScoreRangeCell(key)}
            {renderNumAnsweredCell(key)}
            {renderScoreMeaningCell(key)}
            {renderComparedToLastCell(key)}
          </TableRow>
        ))}
      </TableBody>
    );
  };

  const renderSummary = () => {
    if (!hasList())
      return (
        <Box sx={{ padding: theme.spacing(0, 2, 2, 2) }}>
          <Alert severity="warning">No summary available</Alert>
        </Box>
      );
    return (
      <TableContainer
        className="table-container"
        sx={{
          padding: {
            xs: 0,
            sm: theme.spacing(1, 2),
          },
          paddingTop: 0,
          marginBottom: 1,
          maxWidth: {
            xs: "204px",
            sm: "100%",
          },
          position: {
            xs: "initial",
            sm: "relative",
          },
          marginLeft: {
            xs: theme.spacing(29.5),
            sm: 0,
          },
          verticalAlign: "middle",
          borderRadius: 0,
        }}
        component={Paper}
      >
        <Table
          sx={{ border: "1px solid #ececec" }}
          size="small"
          aria-label="scoring summary table"
          className="scoring-summary-table"
        >
          {renderTableHeaderRow()}
          {renderTableBody()}
        </Table>
      </TableContainer>
    );
  };

  return (
    <Paper
      className="scoring-summary-container"
      sx={{ borderTop: "1px solid rgb(0 0 0 / 5%)" }}
    >
      {renderTitle()}
      {renderSummary()}
    </Paper>
  );
}

ScoringSummary.propTypes = {
  summaryData: PropTypes.object,
};
