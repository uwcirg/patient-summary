import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
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
import { getResponseColumns } from "@models/resultBuilders/helpers";
import Scoring from "@components/Score";
import { getCorrectedISODate, getDisplayQTitle, hasHtmlTags, isEmptyArray, isNumber, scrollToAnchor } from "@util";
import ResponsesViewer from "../ResponsesViewer";

// tiny helper to read nested keys like "provider.name"
const getByPath = (obj, path) => {
  if (typeof path !== "string") return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
};

export default function ScoringSummary(props) {
  const theme = useTheme();
  const { data, disableLinks, hiddenColumns = [], columns = [] } = props;

  const isColVisible = (id) => {
    if (id === "measure") return true;
    return !hiddenColumns?.includes(id);
  };

  const iconProps = { fontSize: "small", sx: { verticalAlign: "middle" } };
  const getDisplayIcon = (row) => {
    const comparison = row?.comparison;
    const comparisonToAlert = row?.comparisonToAlert;
    if (!comparison) return null;
    if (comparison === "equal") return <HorizontalRuleIcon {...iconProps} />;
    if (comparisonToAlert === "lower") {
      if (comparison === "lower") return <SouthIcon color="error" {...iconProps} />;
      if (comparison === "higher") return <NorthIcon color="info" {...iconProps} />;
      return comparison;
    } else {
      if (comparison === "higher") return <NorthIcon color="error" {...iconProps} />;
      if (comparison === "lower") return <SouthIcon color="info" {...iconProps} />;
      return comparison;
    }
  };

  const handleClick = (e, anchorElementId) => {
    e.preventDefault();
    scrollToAnchor(anchorElementId);
  };

  const displayScoreRange = (row) => {
    const { minScore, maxScore, minimumScore, maximumScore } = row;
    const minScoreToUse = isNumber(minScore) ? minScore : isNumber(minimumScore) ? minimumScore : 0;
    const maxScoreToUse = isNumber(maxScore) ? maxScore : isNumber(maximumScore) ? maximumScore : 0;
    if (!isNumber(minScoreToUse) || !isNumber(maxScoreToUse)) return "";
    if (minScoreToUse === maxScoreToUse) return "";
    return `( ${minScoreToUse} - ${maxScoreToUse} )`;
  };

  const displayNumAnswered = (row) => {
    const { totalItems, totalAnsweredItems } = row;
    if (!totalItems && !totalAnsweredItems) return "No";
    if (totalItems === 1 && totalAnsweredItems === 1) return "Yes";
    if (isNumber(totalAnsweredItems) && isNumber(totalItems)) return `${totalAnsweredItems} / ${totalItems}`;
    if (totalAnsweredItems) return "Yes";
    return "No";
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
    verticalAlign: "center",
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
    text: (row, value) => (
      <span className={row.alert ? "text-error" : row.warning ? "text-warning" : !value ? "muted-text" : ""}>
        {value ?? "N/A"}
      </span>
    ),
    date: (row, value) => (
      <Stack direction={"column"} spacing={1} alignItems={"center"} justifyContent={"center"}>
        {value ? getCorrectedISODate(value) : ""}
        {row.source && <span className="muted-text">{row.source}</span>}
      </Stack>
    ),
    score: (row) => {
      if (row.displayMeaningNotScore) return null;
      return (
        <>
          {isNumber(row.score) && (
            <Stack
              direction="column"
              spacing={0.75}
              justifyContent="space-between"
              alignItems="center"
              sx={{ width: "100%" }}
              className="score-wrapper"
            >
              <Scoring
                score={row.score}
                scoreParams={{ ...row, ...(row.scoringParams ?? {}) }}
                justifyContent="space-between"
              />
              <Box className="no-wrap-text muted-text" sx={{ fontSize: "0.65rem" }}>
                {displayScoreRange(row)}
              </Box>
            </Stack>
          )}
          {!isNumber(row.score) && row.text && (
            <Stack justifyContent="space-between" alignItems="center">
              <Box sx={{ color: row.alert ? "error.main" : row.warning ? "warning.main" : "#444" }}>{row.text}</Box>
            </Stack>
          )}
          {/* {!isNumber(row.score) && !row.text && <Box className="muted-text text-center">N/A</Box>} */}
        </>
      );
    },
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
      renderCell: (row) => {
        const displayTitle = getDisplayQTitle(
          row.title ? row.title : row.instrumentName ? row.instrumentName : row.key,
        );
        return !disableLinks ? (
          <Link
            onClick={(e) => handleClick(e, row.key)}
            underline="none"
            sx={{ color: "link.main", cursor: "pointer" }}
            href={`#${row.key}`}
            className="instrument-link"
          >
            {displayTitle} {row.subtitle ? row.subtitle : ""}
          </Link>
        ) : props.enableResponsesViewer && !isEmptyArray(row?.responseData) ? (
          <ResponsesViewer
            title={displayTitle}
            subtitle={row.subtitle}
            responsesTileTitle={displayTitle}
            tableData={row?.tableResponseData}
            columns={getResponseColumns(row?.responseData)}
          />
        ) : (
          displayTitle
        );
      },
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
      id: "score",
      header: "Score",
      align: "center",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small", align: "left" },
      type: "score",
    },
    {
      id: "meaning",
      header: "Meaning",
      align: "left",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small", className: "capitalized-text" },
      accessor: (row) =>
        row.meaning
          ? row.meaning.includes(",")
            ? row.meaning.split(",").map((m, index) => {
                if (hasHtmlTags)
                  return (
                    <Box
                      sx={{ mb: 0.4 }}
                      key={`${row.id}_meaning_${index}`}
                      dangerouslySetInnerHTML={{ __html: m }}
                    ></Box>
                  );
                return (
                  <Box sx={{ mb: 0.4 }} key={`${row.id}_meaning_${index}`}>
                    {m}
                  </Box>
                );
              })
            : row.meaning
          : "",
      type: "text",
    },
    {
      id: "lastAssessed",
      header: "Last Done",
      align: "center",
      type: "date",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small" },
      accessor: (row) => (row.lastAssessed ? row.lastAssessed : (row.date ?? "")),
    },

    {
      id: "comparison",
      header: "Change from Last",
      align: "center",
      headerProps: { sx: { ...baseCellStyle, borderRightWidth: 0 }, ...defaultHeaderCellProps },
      cellProps: { sx: { ...baseCellStyle, borderRightWidth: 0 }, size: "small" },
      renderCell: (row) => getDisplayIcon(row),
    },
  ];

  // ----- merge defaults with user-provided columns by id
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

  // ----- visible columns with fallback when everything is hidden
  const allVisibleColumns = EFFECTIVE_COLUMNS.filter((c) => isColVisible(c.id));
  const firstColumn = EFFECTIVE_COLUMNS.find((c) => c.id === "measure") || EFFECTIVE_COLUMNS[0];

  const NO_DATA_COLUMN = {
    id: "__noData",
    header: "No Data",
    align: "center",
    headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
    cellProps: { sx: baseCellStyle, size: "small" },
    renderCell: () => (
      <Box className="muted-text text-center" sx={{ fontStyle: "italic" }}>
        No Data
      </Box>
    ),
  };

  const visibleColumns =
    allVisibleColumns.length === 0
      ? firstColumn
        ? [firstColumn, NO_DATA_COLUMN]
        : [NO_DATA_COLUMN]
      : allVisibleColumns;

  // ----- table sections
  const renderTableHeader = () => (
    <TableHead>
      <TableRow sx={{ backgroundColor: "lightest.main" }}>
        {visibleColumns.map((col) => (
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

  const renderTableBody = () => {
    const dataToUse = Array.isArray(data) ? data : data ? [data] : [];
    const hasData = dataToUse.length > 0;

    return (
      <TableBody>
        {hasData ? (
          dataToUse.map((row, index) => (
            <TableRow key={`summary_${row.key || index}_${index}`}>
              {visibleColumns.map((col) => (
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
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={visibleColumns.length}
              align="center"
              sx={{
                ...baseCellStyle,
                // remove sticky styling for the merged cell
                position: "static",
                backgroundColor: "transparent",
                fontStyle: "italic",
                color: "text.secondary",
              }}
            >
              {props.emptyMessage || "No Data"}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    );
  };

  const renderSummary = () => {
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
          alignSelf: "stretch",
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
            ...(props.tableStyle ?? {}),
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
    <Stack className="scoring-summary-container" spacing={1} direction="column" sx={props.containerStyle ?? {}}>
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
  data: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  disableLinks: PropTypes.bool,
  enableResponsesViewer: PropTypes.bool,
  hiddenColumns: PropTypes.arrayOf(
    PropTypes.oneOf(["id", "source", "measure", "lastAssessed", "score", "numAnswered", "meaning", "comparison"]),
  ),
  columns: PropTypes.arrayOf(columnShape),
  emptyMessage: PropTypes.string,
  tableStyle: PropTypes.object,
  containerStyle: PropTypes.object,
};
