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
import Scoring from "../Score";
import qConfig from "../../config/questionnaire_config";
import { isNumber, getDisplayQTitle, scrollToAnchor, getLocaleDateStringFromDate } from "../../util/util";

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
  const { summaryData, questionnaireList } = props;
  const hasNoResponses = (responses) => !responses || !responses.length;
  const responsesHasScore = (responses) => {
    if (hasNoResponses(responses)) return false;
    return responses.some((result) => isNumber(result.score));
  };
  const getInstrumentShortName = (id) => {
    const key = getDisplayQTitle(id).toLowerCase();
    if (qConfig[key] && qConfig[key].shortTitle) {
      return qConfig[key].shortTitle;
    }
    const matchedQuestionnaire = questionnaireList
      ? questionnaireList
          .filter((q) => q.id === id && q.questionnaireJson)
          .map((q) => q.questionnaireJson)
      : null;
    if (matchedQuestionnaire && matchedQuestionnaire.length) {
      const { id, name, title } = matchedQuestionnaire[0];
      return name || title || id;
    }
    return String(key).toUpperCase();
  };
  const hasList = () =>
    summaryData &&
    Object.keys(summaryData).length > 0 &&
    Object.keys(summaryData).some((key) => {
      return responsesHasScore(summaryData[key].responses);
    });
  const getSortedResponses = (rdata) => {
    if (hasNoResponses(rdata)) return [];
    return rdata.sort(
      (a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return bTime - aTime;
      }
    );
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
  }

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
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow: "hidden",
  };
  const cellStyle = {
    borderRight: `1px solid ${borderColor}`,
    whiteSpace: "nowrap",
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
      ...{whiteSpace: { xs: "nowrap", sm: "normal" }},
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
        <TableCell
          sx={cellStyle}
          {...defaultHeaderCellProps}
        >
          Last assessed
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
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
        href={`#${key}`}
      >
        {getInstrumentShortName(key)}
      </Link>
    </TableCell>
  );

  const renderScoreCell = (key) => (
    <TableCell align="left" size="small" className="score-cell" sx={cellStyle}>
      <Stack
        direction={"row"}
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
    <Stack className="scoring-summary-container" spacing={1} direction="column">
      {renderSummary()}
    </Stack>
  );
}

ScoringSummary.propTypes = {
  summaryData: PropTypes.object,
  questionnaireList: PropTypes.array,
};
