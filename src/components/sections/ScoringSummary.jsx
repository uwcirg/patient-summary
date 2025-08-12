import React from "react";
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
import Stack from "@mui/material/Stack";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import Scoring from "@components/Score";
import Questionnaire from "@models/Questionnaire";
import { isEmptyArray, isNumber, scrollToAnchor, getLocaleDateStringFromDate } from "@util";

export default function ScoringSummary(props) {
  const theme = useTheme();
  const bgColor =
    theme && theme.palette && theme.palette.lightest && theme.palette.lightest.main
      ? theme.palette.lightest.main
      : "#FFF";
  const linkColor =
    theme && theme.palette && theme.palette.link && theme.palette.link.main ? theme.palette.link.main : "blue";
  const borderColor =
    theme && theme.palette && theme.palette.border && theme.palette.border.main ? theme.palette.border.main : "#FFF";
  const { summaryData } = props;
  const hasNoResponses = (responses) => isEmptyArray(responses);
  const responsesHasScore = (responses) => {
    if (hasNoResponses(responses)) return false;
    return responses.some((result) => isNumber(result.score));
  };
  const getInstrumentShortName = (id) => {
    const matchedQuestionnaire =
      summaryData[id] && summaryData[id].questionnaire ? summaryData[id].questionnaire : null;
    const qo = new Questionnaire(matchedQuestionnaire, id);
    return qo.shortName ?? qo.displayName;
  };
  const hasList = () =>
    summaryData &&
    Object.keys(summaryData).length > 0 &&
    Object.keys(summaryData).some((key) => {
      return responsesHasScore(summaryData[key].responses);
    });
  const getSortedResponses = (rdata) => {
    if (hasNoResponses(rdata)) return [];
    return rdata.sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return bTime - aTime;
    });
  };
  const getResponsesByIndex = (rdata, index) => {
    const sortedResponses = getSortedResponses(rdata);
    if (hasNoResponses(sortedResponses)) return null;
    return sortedResponses[index];
  };

  const getCurrentResponses = (rdata) => {
    return getResponsesByIndex(rdata, 0);
  };

  const getPrevResponses = (rdata) => {
    return getResponsesByIndex(rdata, 1);
  };

  const getPrevScoreByInstrument = (rdata) => {
    const responses = getPrevResponses(rdata);
    if (!responses || !responses.date) return parseInt(null);
    return parseInt(responses.score);
  };

  const getCurrentScoreByInstrument = (rdata) => {
    const responses = getCurrentResponses(rdata);
    if (!responses || !responses.date) return parseInt(null);
    const score = responses.score;
    return isNumber(score) ? score : "--";
  };
  const getDisplayIcon = (rdata) => {
    const currentResponses = getCurrentResponses(rdata);
    const comparisonToAlert = currentResponses ? currentResponses.comparisonToAlert : ""; // display alert if score is lower/higher than previous
    const currentScore = getCurrentScoreByInstrument(rdata);
    const prevScore = getPrevScoreByInstrument(rdata);
    const iconProps = {
      fontSize: "small",
      sx: { verticalAlign: "middle" },
    };
    //console.log("current score ", currentScore, " prev score ", prevScore);
    if (!isNumber(prevScore) || !isNumber(currentScore)) return "--";
    if (isNumber(prevScore)) {
      if (comparisonToAlert === "lower") {
        if (currentScore < prevScore) return <SouthIcon color="error" {...iconProps}></SouthIcon>;
        if (currentScore > prevScore) return <NorthIcon color="success" {...iconProps}></NorthIcon>;
        return <HorizontalRuleIcon {...iconProps}></HorizontalRuleIcon>;
      } else {
        if (currentScore > prevScore) return <NorthIcon color="error" {...iconProps}></NorthIcon>;
        if (currentScore < prevScore) return <SouthIcon color="success" {...iconProps}></SouthIcon>;
        return <HorizontalRuleIcon {...iconProps}></HorizontalRuleIcon>;
      }
    } else {
      if (isNumber(currentScore)) return <HorizontalRuleIcon color="info" {...iconProps}></HorizontalRuleIcon>;
      return null;
    }
  };
  const handleClick = (e, anchorElementId) => {
    e.preventDefault();
    scrollToAnchor(anchorElementId);
  };
  const getScoreList = () => {
    if (!hasList()) return [];
    return Object.keys(summaryData);
  };

  const getMostRecentEntry = (summaryData) => {
    return getResponsesByIndex(summaryData.responses, 0);
  };

  const displayScoreRange = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return null;
    const scoringParams = mostRecentEntry.scoringParams;
    if (!scoringParams) return null;
    if (!scoringParams.maximumScore) return null;
    const minScore = scoringParams.minimumScore ? scoringParams.minimumScore : 0;
    const maxScore = scoringParams.maximumScore;
    return `( ${minScore} - ${maxScore} )`;
  };

  const displayLastAssessed = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return "--";
    if (!mostRecentEntry.date) return "--";
    return getLocaleDateStringFromDate(mostRecentEntry.date);
  };

  const displayNumAnswered = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return "--";
    const totalItems = mostRecentEntry.totalItems;
    const totalAnsweredItems = mostRecentEntry.totalAnsweredItems;
    if (!totalItems || !totalAnsweredItems) return "--";
    return `${totalAnsweredItems} / ${totalItems}`;
  };

  const displayScoreMeaning = (summaryData) => {
    const mostRecentEntry = getMostRecentEntry(summaryData);
    if (!mostRecentEntry) return "--";
    return mostRecentEntry.scoreMeaning;
  };

  const scoreList = getScoreList();
  const defaultTableCellProps = {
    size: "small",
  };
  const defaultHeaderCellProps = {
    ...defaultTableCellProps,
    align: "center",
    variant: "head",
  };
  const cellWhiteSpaceStyle = {
    wordBreak: "break-word",
    whiteSpace: "normal",
  };
  const cellStyle = {
    borderRight: `1px solid ${borderColor}`,
    whiteSpace: "nowrap",
    lineHeight: 1.4,
    fontSize: "0.8rem",
    padding: theme.spacing(0.5, 1),
    verticalAlign: "top",
    ...cellWhiteSpaceStyle,
  };
  const fixedCellStyle = {
    ...cellStyle,
    ...{
      position: "sticky",
      left: 0,
      zIndex: 1,
      backgroundColor: "#FFF",
    },
  };
  const renderTableHeaderRow = () => (
    <TableHead>
      <TableRow sx={{ backgroundColor: bgColor }}>
        <TableCell
          sx={{
            ...fixedCellStyle,
            ...{
              minHeight: {
                xs: theme.spacing(4),
                sm: "auto",
              },
              backgroundColor: bgColor,
            },
          }}
          {...defaultHeaderCellProps}
        ></TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          Date
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          Score
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          # <br /> Answered
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          Meaning
        </TableCell>
        <TableCell variant="head" sx={{ ...cellStyle, borderRightWidth: 0 }} {...defaultTableCellProps}>
          Compared <br /> to <br />
          Last
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
          borderBottom: `2px solid ${borderColor}`,
        },
      }}
      size="small"
    >
      <Link
        onClick={(e) => handleClick(e, key)}
        underline="none"
        sx={{ color: linkColor, cursor: "pointer" }}
        href={`#${key}`}
        className="instrument-link"
      >
        {getInstrumentShortName(key)}
      </Link>
    </TableCell>
  );

  const renderScoreCell = (key) => (
    <TableCell align="left" size="small" className="score-cell" sx={cellStyle}>
      <Stack
        direction={"column"}
        spacing={1}
        justifyContent={"space-between"}
        alignItems={"center"}
        sx={{ width: "100%" }}
      >
        <Scoring
          score={getCurrentScoreByInstrument(summaryData[key].responses)}
          scoreParams={getMostRecentEntry(summaryData[key])}
          justifyContent="space-between"
        ></Scoring>
        <Box className="no-wrap-text muted-text" sx={{ fontSize: "0.7rem" }}>
          {displayScoreRange(summaryData[key])}
        </Box>
      </Stack>
    </TableCell>
  );

  const renderLastAssessedCell = (key) => (
    <TableCell align="center" size="small" sx={cellStyle}>
      {displayLastAssessed(summaryData[key])}
    </TableCell>
  );

  const renderNumAnsweredCell = (key) => (
    <TableCell align="center" size="small" sx={cellStyle}>
      {displayNumAnswered(summaryData[key])}
    </TableCell>
  );

  const renderScoreMeaningCell = (key) => (
    <TableCell align="center" size="small" className="capitalized-text" sx={cellStyle}>
      {displayScoreMeaning(summaryData[key])}
    </TableCell>
  );

  const renderComparedToLastCell = (key) => (
    <TableCell align="center" size="small" sx={{ ...cellStyle, borderRightWidth: 0 }}>
      {getDisplayIcon(summaryData[key].responses)}
    </TableCell>
  );

  const renderTableBody = () => {
    return (
      <TableBody>
        {scoreList.map((key, index) => (
          <TableRow key={`{summary_${index}}`}>
            {renderInstrumentLinkCell(key)}
            {renderLastAssessedCell(key)}
            {renderScoreCell(key)}
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
        <Box sx={{ padding: theme.spacing(1, 0.5) }}>
          <Alert severity="warning">No score summary available</Alert>
        </Box>
      );
    return (
      <TableContainer
        className="table-container"
        sx={{
          padding: 0,
          height: "100%",
          maxWidth: {
            xs: "420px",
            sm: "100%",
          },
          position: {
            xs: "initial",
            sm: "relative",
          },
          marginLeft: {
            sm: 0,
          },
          borderRadius: 0,
        }}
      >
        <Table
          sx={{ border: `1px solid ${borderColor}`, tableLayout: "fixed", width: "100%", height: "100%" }}
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
    <Stack
      className="scoring-summary-container"
      spacing={1}
      direction="column"
      sx={{
        alignSelf: "stretch",
        height: "100%",
      }}
    >
      {renderSummary()}
    </Stack>
  );
}

ScoringSummary.propTypes = {
  summaryData: PropTypes.object,
};
