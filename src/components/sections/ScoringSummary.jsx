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
import { isEmptyArray, isNumber, scrollToAnchor } from "@util";

// tiny helper to read nested keys like "provider.name"
const getByPath = (obj, path) => {
  if (typeof path !== "string") return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
};

export default function ScoringSummary(props) {
  const theme = useTheme();
  const { scoringSummaryData, disableLinks, hiddenColumns = [], columns = [] } = props;

  const isColVisible = (id) => !hiddenColumns?.includes(id);

  const iconProps = { fontSize: "small", sx: { verticalAlign: "middle" } };
  const getDisplayIcon = (row) => {
    const comparison = row?.comparison;
    const comparisonToAlert = row?.comparisonToAlert;
    if (!comparison) return "";
    if (comparison === "equal") return <HorizontalRuleIcon {...iconProps} />;
    if (comparisonToAlert === "lower") {
      if (comparison === "lower") return <SouthIcon color="error" {...iconProps} />;
      if (comparison === "higher") return <NorthIcon color="success" {...iconProps} />;
      return comparison;
    } else {
      if (comparison === "higher") return <NorthIcon color="error" {...iconProps} />;
      if (comparison === "lower") return <SouthIcon color="success" {...iconProps} />;
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
    if (!totalItems && !totalAnsweredItems) return "--";
    if (!totalItems && totalAnsweredItems) return "Yes";
    return `${totalAnsweredItems} / ${totalItems}`;
  };

  // -------- styles
  const defaultTableCellProps = { size: "small" };
  const defaultHeaderCellProps = { ...defaultTableCellProps, align: "center", variant: "head" };
  const cellWhiteSpaceStyle = { wordBreak: "break-word", whiteSpace: "normal" };
  const baseCellStyle = {
    borderRight: `1px solid`,
    borderColor: "border.main",
    whiteSpace: "nowrap",
    lineHeight: 1.4,
    fontSize: "0.8rem",
    wordBreak: "break-word",
    padding: theme.spacing(0.75, 1),
    verticalAlign: "top",
    ...cellWhiteSpaceStyle,
  };
  const stickyStyle = {
    position: "sticky",
    left: 0,
    zIndex: 1,
    backgroundColor: "#FFF",
  };

  // -------- reusable default cell renderers
  const defaultRenderers = {
    text: (row, value) => <span className={row.alert ? "text-error" : ""}>{value ?? "--"}</span>,
    date: (row, value) => <>{value ?? "--"}</>,
    score: (row) => (
      <>
        {isNumber(row.score) && (
          <Stack
            direction="column"
            spacing={0.75}
            justifyContent="space-between"
            alignItems="center"
            sx={{ width: "100%" }}
          >
            <Scoring score={row.score} scoreParams={row.scoringParams} justifyContent="space-between" />
            <Box className="no-wrap-text muted-text" sx={{ fontSize: "0.65rem" }}>
              {displayScoreRange(row.minScore, row.maxScore)}
            </Box>
          </Stack>
        )}
        {row.text && (
          <Stack justifyContent="space-between" alignItems="center">
            <Box sx={{ color: row.alert ? "error.main" : "#444" }}>{row.text}</Box>
          </Stack>
        )}
      </>
    ),
  };

  // -------- original columns ------------
  const DEFAULT_COLUMNS = [
    {
      id: "measure",
      header: "Measure",
      sticky: true,
      align: "left",
      headerProps: {
        sx: {
          ...stickyStyle,
          minHeight: { xs: theme.spacing(4), sm: "auto" },
          backgroundColor: "lightest.main",
        },
        ...defaultHeaderCellProps,
      },
      cellProps: {
        sx: {
          ...baseCellStyle,
          ...stickyStyle,
          fontWeight: 500,
          borderBottom: `1px solid`,
          borderBottomColor: "border.main",
        },
        size: "small",
      },
      // custom cell that preserves link behavior
      renderCell: (row) =>
        !disableLinks ? (
          <Link
            onClick={(e) => handleClick(e, row.key)}
            underline="none"
            sx={{ color: "link.main", cursor: "pointer" }}
            href={`#${row.key}`}
            className="instrument-link"
          >
            {row.instrumentName}
          </Link>
        ) : (
          row.instrumentName
        ),
    },
    {
      id: "lastAssessed",
      header: "Most Recent PRO Date",
      align: "center",
      type: "date",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small" },
      accessor: "lastAssessed",
    },
    {
      id: "score",
      header: "Score / Result",
      align: "center",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small", align: "left" },
      type: "score",
    },
    {
      id: "numAnswered",
      header: "Answered",
      align: "center",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small" },
      renderCell: (row) => displayNumAnswered(row),
    },
    {
      id: "meaning",
      header: "Meaning",
      align: "center",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small", className: "capitalized-text" },
      accessor: "meaning",
      type: "text",
    },
    {
      id: "comparison",
      header: "Compared to Last",
      align: "center",
      headerProps: { sx: { ...baseCellStyle, borderRightWidth: 0 }, ...defaultHeaderCellProps },
      cellProps: { sx: { ...baseCellStyle, borderRightWidth: 0 }, size: "small" },
      renderCell: (row) => getDisplayIcon(row),
    },
  ];

  // ----- merge defaults with user-provided columns by id
  // Rules:
  //  - If user column id matches default: shallow-merge (user overrides fields), keeps order of DEFAULT_COLUMNS
  //  - Any extra user columns (unknown ids) are appended at the end (in user-provided order)
  const defaultById = Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.id, c]));
  const userById = Object.fromEntries((columns || []).map((c) => [c.id, c]));

  const merged = DEFAULT_COLUMNS.map((d) => {
    const u = userById[d.id];
    if (!u) return d;
    const m = { ...d, ...(u || {}) };
    if ((u.accessor || u.type) && !u.renderCell) delete m.renderCell;
    return m;
  });

  const extras = (columns || []).filter((c) => !defaultById[c.id]);
  const EFFECTIVE_COLUMNS = [...merged, ...extras];

  // ----- table sections
  const renderTableHeader = () => (
    <TableHead>
      <TableRow sx={{ backgroundColor: "lightest.main" }}>
        {EFFECTIVE_COLUMNS.filter((c) => isColVisible(c.id)).map((col) => (
          <TableCell
            key={`header_${col.id}`}
            {...defaultHeaderCellProps}
            align={col.align || defaultHeaderCellProps.align}
            {...(col.headerProps || {})}
            sx={{
              ...baseCellStyle,
              ...(col.sticky ? stickyStyle : {}),
              ...(col.headerProps?.sx || {}),
              ...(col.width ? { width: col.width } : {}),
            }}
          >
            {col.header}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  const renderCell = (col, row) => {
    const value =
      typeof col.accessor === "function"
        ? col.accessor(row)
        : typeof col.accessor === "string"
          ? getByPath(row, col.accessor)
          : undefined;

    if (typeof col.renderCell === "function") return col.renderCell(row, value);
    if (col.type && defaultRenderers[col.type]) return defaultRenderers[col.type](row, value);
    return <>{value ?? "—"}</>;
  };

  const renderTableBody = () => (
    <TableBody>
      {scoringSummaryData.map((row, index) => (
        <TableRow key={`summary_${row.key || index}_${index}`}>
          {EFFECTIVE_COLUMNS.filter((c) => isColVisible(c.id)).map((col) => (
            <TableCell
              key={`cell_${col.id}_${row.key || index}`}
              {...defaultTableCellProps}
              align={col.align || "left"}
              {...(col.cellProps || {})}
              sx={{
                ...baseCellStyle,
                ...(col.sticky ? stickyStyle : {}),
                ...(col.cellProps?.sx || {}),
              }}
            >
              {renderCell(col, row)}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );

  const renderSummary = () => {
    if (isEmptyArray(scoringSummaryData)) return <Alert severity="warning">No score summary available</Alert>;
    return (
      <TableContainer
        className="table-container"
        sx={{
          padding: 0,
          height: "100%",
          overflow: "hidden",
          maxWidth: { xs: "420px", sm: "100%" },
          position: { xs: "initial", sm: "relative" },
          marginLeft: { sm: 0 },
          borderRadius: 0,
        }}
      >
        <Table
          sx={{
            borderStyle: "solid",
            borderWidth: "1px",
            borderColor: "border.main",
            tableLayout: "fixed",
            width: "100%",
            height: "100%",
            ...props.tableStyle??{}
          }}
          size="small"
          aria-label="scoring summary table"
          className="scoring-summary-table"
        >
          {renderTableHeader()}
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

const columnShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  header: PropTypes.node.isRequired,
  accessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  renderCell: PropTypes.func, // (row, value) => node
  headerProps: PropTypes.object,
  cellProps: PropTypes.object,
  sticky: PropTypes.bool,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  align: PropTypes.oneOf(["left", "center", "right"]),
  type: PropTypes.oneOf(["text", "date", "score"]),
});

ScoringSummary.propTypes = {
  scoringSummaryData: PropTypes.array,
  disableLinks: PropTypes.bool,
  hiddenColumns: PropTypes.arrayOf(
    PropTypes.oneOf(["measure", "lastAssessed", "score", "numAnswered", "meaning", "comparison"]),
  ),
  columns: PropTypes.arrayOf(columnShape),
  tableStyle: PropTypes.object
};
