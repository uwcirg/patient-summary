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
  const hasNoResponses = (responses) => !responses || !responses.length;
  const responsesHasScore = (responses) => {
    if (hasNoResponses(responses)) return false;
    return responses.some((result) => isNumber(result.score));
  };
  const getInstrumentShortName = (id) =>
    qConfig[id] && qConfig[id].shortTitle
      ? qConfig[id].shortTitle
      : String(id).toUpperCase();
  const hasList = () =>
    summaryData &&
    Object.keys(summaryData).length > 0 &&
    Object.keys(summaryData).some((key) => {
      return responsesHasScore(summaryData[key].responses);
    });
  const getSortedResponses = (rdata) => {
    if (hasNoResponses(rdata)) return [];
    return rdata.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };
  const getResponsesByIndex = (rdata, index) => {
    const sortedResponses = getSortedResponses(rdata);
    if (hasNoResponses(sortedResponses)) return null;
    return sortedResponses[index];
  };

  const getPrevScoreByInstrument = (rdata) => {
    const responses = getResponsesByIndex(rdata, 1);
    if (!responses || !responses.date) return parseInt(null);
    return parseInt(responses.score);
  };

  const getCurrentScoreByInstrument = (rdata) => {
    const responses = getResponsesByIndex(rdata, 0);
    if (!responses || !responses.date) return parseInt(null);
    const score = responses.score;
    return isNumber(score) ? score : "--";
  };
  const getDisplayIcon = (id, rdata) => {
    const comparisonToAlert = qConfig[id] && qConfig[id].comparisonToAlert;
    const currentScore = getCurrentScoreByInstrument(rdata);
    const prevScore = getPrevScoreByInstrument(rdata);
    const iconProps = {
      fontSize: "small",
      sx: { verticalAlign: "middle" },
    };
    //console.log("current score ", currentScore, " prev score ", prevScore);
    if (isNaN(prevScore) || isNaN(currentScore)) return "--";
    if (!isNaN(prevScore)) {
      if (comparisonToAlert === "lower") {
        if (currentScore < prevScore)
          return <SouthIcon color="error" {...iconProps}></SouthIcon>;
        if (currentScore > prevScore)
          return <NorthIcon color="success" {...iconProps}></NorthIcon>;
        return <HorizontalRuleIcon {...iconProps}></HorizontalRuleIcon>;
      } else {
        if (currentScore > prevScore)
          return <NorthIcon color="error" {...iconProps}></NorthIcon>;
        if (currentScore < prevScore)
          return <SouthIcon color="success" {...iconProps}></SouthIcon>;
        return <HorizontalRuleIcon {...iconProps}></HorizontalRuleIcon>;
      }
    } else {
      if (!isNaN(currentScore))
        return (
          <HorizontalRuleIcon color="info" {...iconProps}></HorizontalRuleIcon>
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
      variant="h5"
      component="h2"
      color="accent"
      sx={{
        padding: theme.spacing(1, 0.5, 0),
        fontSize: "1.35rem",
        fontWeight: 500
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
    return getResponsesByIndex(summaryData.responses, 0);
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
  const defaultTableCellProps = {
    size: "small",
  };
  const defaultHeaderCellProps = {
    ...defaultTableCellProps,
    align: "center",
    variant: "head",
  };
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
          sx={{
            ...fixedCellStyle,
            ...{
              minHeight: {
                xs: theme.spacing(4),
                sm: "auto",
              },
            },
          }}
          {...defaultHeaderCellProps}
        ></TableCell>
        <TableCell sx={cellStyle} {...{...defaultHeaderCellProps, ...{align: "left"}}} colSpan={2}>
          Score
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          # Answered
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          Meaning
        </TableCell>
        <TableCell
          variant="head"
          sx={{ ...cellStyle, borderRightWidth: 0 }}
          {...defaultTableCellProps}
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
        scoreParams={getMostRecentEntry(summaryData[key])}
        justifyContent="space-between"
      ></Scoring>
    </TableCell>
  );

  const renderScoreRangeCell = (key) => (
    <TableCell align="right" size="small" sx={{...cellStyle, padding: 0}}>
      <Box className="no-wrap-text muted-text text-left" sx={{width: "100%"}}>
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
        <Box sx={{ padding: theme.spacing(2, 0.5) }}>
          <Alert severity="warning">No summary available</Alert>
        </Box>
      );
    return (
      <TableContainer
        className="table-container"
        sx={{
          padding: {
            xs: 0,
            sm: theme.spacing(1, 0.5),
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
          borderRadius: 0,
        }}
      >
        <Table
          sx={{ border: `1px solid ${borderColor}` }}
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
    <Box className="scoring-summary-container">
      {renderTitle()}
      {renderSummary()}
    </Box>
  );
}

ScoringSummary.propTypes = {
  summaryData: PropTypes.object,
};
