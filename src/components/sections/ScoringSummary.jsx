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
import { isEmptyArray, isNumber, scrollToAnchor } from "@util";
import { buildScoringSummaryRows } from "@models/resultBuilders/helpers";

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
  const getDisplayIcon = (row) => {
    const iconProps = {
      fontSize: "small",
      sx: { verticalAlign: "middle" },
    };
    const comparison = row?.comparison;
    const comparisonToAlert = row?.comparisonToAlert;
    //console.log("current score ", currentScore, " prev score ", prevScore);
    if (!comparison) return "--";
    if (comparison === "equal") return <HorizontalRuleIcon {...iconProps}></HorizontalRuleIcon>;
    if (comparisonToAlert === "lower") {
      if (comparison === "lower") return <SouthIcon color="error" {...iconProps}></SouthIcon>;
      if (comparison === "higher") return <NorthIcon color="success" {...iconProps}></NorthIcon>;
      return comparison;
    } else {
      if (comparison === "higher") return <NorthIcon color="error" {...iconProps}></NorthIcon>;
      if (comparison === "lower") return <SouthIcon color="success" {...iconProps}></SouthIcon>;
      return comparison;
    }
  };
  const handleClick = (e, anchorElementId) => {
    e.preventDefault();
    scrollToAnchor(anchorElementId);
  };

  const displayScoreRange = (minScore, maxScore) => {
    if (!isNumber(minScore) || !isNumber(maxScore)) return "";
    return `( ${minScore} - ${maxScore} )`;
  };

  const displayNumAnswered = (row) => {
    const totalItems = row.totalItems;
    const totalAnsweredItems = row.totalAnswered;
    if (!totalItems || !totalAnsweredItems) return "--";
    return `${totalAnsweredItems} / ${totalItems}`;
  };

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
    padding: theme.spacing(0.75, 1),
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
          # Answered
        </TableCell>
        <TableCell sx={cellStyle} {...defaultHeaderCellProps}>
          Meaning
        </TableCell>
        <TableCell variant="head" sx={{ ...cellStyle, borderRightWidth: 0 }} {...defaultTableCellProps}>
          Compared to Last
        </TableCell>
      </TableRow>
    </TableHead>
  );

  const renderInstrumentLinkCell = (row) => (
    <TableCell
      sx={{
        ...fixedCellStyle,
        ...{
          fontWeight: 500,
          borderBottom: `2px solid ${borderColor}`,
        },
      }}
      size="small"
      key={`score_summary_${row.key}_link`}
    >
      <Link
        onClick={(e) => handleClick(e, row.key)}
        underline="none"
        sx={{ color: linkColor, cursor: "pointer" }}
        href={`#${row.key}`}
        className="instrument-link"
      >
        {row.instrumentName}
      </Link>
    </TableCell>
  );

  const renderScoreCell = (row) => (
    <TableCell
      align="left"
      size="small"
      className="score-cell"
      sx={cellStyle}
      key={`score_summary_${row.key}_score_cell`}
    >
      <Stack
        direction={"column"}
        spacing={0.75}
        justifyContent={"space-between"}
        alignItems={"center"}
        sx={{ width: "100%" }}
      >
        <Scoring score={row.score} scoreParams={row.scoringParams} justifyContent="space-between"></Scoring>
        <Box className="no-wrap-text muted-text" sx={{ fontSize: "0.65rem" }}>
          {displayScoreRange(row.minScore, row.maxScore)}
        </Box>
      </Stack>
    </TableCell>
  );

  const renderLastAssessedCell = (row) => (
    <TableCell align="center" size="small" sx={cellStyle} key={`score_summary_${row.key}_last_assessed`}>
      {row.lastAssessed}
    </TableCell>
  );

  const renderNumAnsweredCell = (row) => (
    <TableCell align="center" size="small" sx={cellStyle} key={`score_summary_${row.key}_num_answered`}>
      {displayNumAnswered(row)}
    </TableCell>
  );

  const renderScoreMeaningCell = (row) => (
    <TableCell
      align="center"
      size="small"
      className="capitalized-text"
      sx={cellStyle}
      key={`score_summary_${row.key}_score_meaning`}
    >
      {row.meaning}
    </TableCell>
  );

  const renderComparedToLastCell = (row) => (
    <TableCell
      align="center"
      size="small"
      sx={{ ...cellStyle, borderRightWidth: 0 }}
      key={`score_summary_${row.key}_compared_to`}
    >
      {getDisplayIcon(row)}
    </TableCell>
  );

  const renderTableBody = () => {
    return (
      <TableBody>
        {summaryRows.map((row, index) => (
          <TableRow key={`{summary_${row.key}_${index}}`}>
            {renderInstrumentLinkCell(row)}
            {renderLastAssessedCell(row)}
            {renderScoreCell(row)}
            {renderNumAnsweredCell(row)}
            {renderScoreMeaningCell(row)}
            {renderComparedToLastCell(row)}
          </TableRow>
        ))}
      </TableBody>
    );
  };

  const summaryRows = React.useMemo(() => {
    if (!summaryData) return [];
    return buildScoringSummaryRows(summaryData, {
      instrumentNameByKey: (key, q) => {
        // preserve your current naming logic, but outside the UI
        const qo = new Questionnaire(q, key);
        return qo.shortName ?? qo.displayName ?? key;
      },
      formatDate: (iso) => (iso ? new Date(iso).toLocaleDateString() : null),
    });
  }, [summaryData]);

  const renderSummary = () => {
    if (isEmptyArray(summaryRows)) return <Alert severity="warning">No score summary available</Alert>;
    return (
      <TableContainer
        className="table-container"
        sx={{
          padding: 0,
          height: "100%",
          overflow: "hidden",
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
