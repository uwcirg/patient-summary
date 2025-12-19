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
import { getDisplayQTitle, getLocaleDateStringFromDate, isEmptyArray, isNumber, scrollToAnchor } from "@util";
import ResponsesViewer from "../ResponsesViewer";
import Meaning from "../Meaning";

// tiny helper to read nested keys like "provider.name"
const getByPath = (obj, path) => {
  if (typeof path !== "string") return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
};

export default function ScoringSummary(props) {
  const theme = useTheme();
  const { data, disableLinks, hiddenColumns = [], columns = [] } = props;

  const hiddenColumnIdsInMobile = ["numAnswered"];

  const isColVisible = (id) => {
    if (id === "measure") return true;
    return !hiddenColumns?.includes(id);
  };

  const iconProps = { fontSize: "small", sx: { verticalAlign: "middle" } };
  const getDisplayIcon = (row) => {
    const comparison = row?.comparison;
    const comparisonToAlert = row?.comparisonToAlert;
    if (!comparison) return null;
    if (comparison === "equal") return <HorizontalRuleIcon aria-label="No change" {...iconProps} />;
    if (comparisonToAlert === "lower") {
      if (comparison === "lower") return <SouthIcon color="error" aria-label="Change to worse" {...iconProps} />;
      if (comparison === "higher") return <NorthIcon color="info" aria-label="Change to better" {...iconProps} />;
      return comparison;
    } else {
      if (comparison === "higher") return <NorthIcon color="error" aria-label="Change to worse" {...iconProps} />;
      if (comparison === "lower") return <SouthIcon color="info" aria-label="Change to better" {...iconProps} />;
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
    whiteSpace: { xs: "normal", sm: "nowrap" }, // allow wrapping on phones
    lineHeight: 1.4,
    fontSize: { xs: "0.75rem", sm: "0.8rem" }, // optional: slightly smaller on xs
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
      <Stack direction={"column"} spacing={1} alignItems={"space-between"} justifyContent={"space-between"}>
        <Box>{value ? getLocaleDateStringFromDate(value) : ""}</Box>
        {row.source && (
          <Box className="muted-text" sx={{ mt: 1, "@media print": {mt: 0} }}>
            {row.source}
          </Box>
        )}
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
              <Box className="no-wrap-text muted-text" sx={{ fontSize: "0.7rem" }}>
                {displayScoreRange(row)}
              </Box>
            </Stack>
          )}
        </>
      );
    },
  };

  const getTitle = (row) => {
    if (row.title) {
      return row.title;
    } else if (row.instrumentName) {
      return row.instrumentName;
    } else if (row.key) {
      return row.key;
    } else {
      if (row.questionnaire && row.questionnaire.title) {
        return row.questionnaire.title;
      }
    }
    return "Untitled Measure";
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
          textAlign: "center",
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
          verticalAlign: "top",
          textAlign: "center",
          height: "100%",
        },
        size: "small",
      },
      renderCell: (row) => {
        const displayTitle = getDisplayQTitle(getTitle(row));
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
            questionnaire={row?.questionnaire}
            buttonStyle={{ width: "100%", maxWidth: 108, margin: "auto" }}
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
      width: "15%",
      headerProps: {
        sx: {
          ...baseCellStyle,
          padding: theme.spacing(0.5),
        },
        ...defaultHeaderCellProps,
      },
      cellProps: { sx: { ...baseCellStyle, whiteSpace: "nowrap", padding: theme.spacing(0.5) } },
      size: "small",
      renderCell: (row) => displayNumAnswered(row),
    },
    {
      id: "scoreMeaning",
      header: "Score / Meaning",
      align: "center",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: {
        sx: {
          ...baseCellStyle,
          // allow wrapping so score + meaning can stack
          whiteSpace: "normal",
        },
        size: "small",
      },
      renderCell: (row) => (
        <Stack sx={{ width: "100%" }} spacing={1} alignItems={"center"}>
          {defaultRenderers.score(row)}
          <Meaning id={row.id ?? row.key} meaning={row.meaning} alert={row.alert} warning={row.warning} />
        </Stack>
      ),
    },

    {
      id: "lastAssessed",
      header: "Last Done",
      align: "center",
      type: "date",
      headerProps: { sx: baseCellStyle, ...defaultHeaderCellProps },
      cellProps: { sx: baseCellStyle, size: "small" },
      accessor: (row) => row.lastAssessed ?? row.date ?? "",
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
  // ----- merge defaults with user-provided columns by id, and use
  // the `columns` prop as the primary ordering when provided
  const userColumns = Array.isArray(columns) ? columns : [];

  const defaultById = Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.id, c]));
  const userById = Object.fromEntries(userColumns.map((c) => [c.id, c]));

  const mergeColumn = (defaultCol, userCol) => {
    if (!defaultCol && !userCol) return null;
    // Start with whichever exists
    let merged = defaultCol ? { ...defaultCol, ...(userCol || {}) } : { ...userCol };

    // If user supplies a new accessor or type but no renderCell,
    // drop the default renderCell to let type/accessor drive rendering.
    if (userCol && (userCol.accessor || userCol.type) && !userCol.renderCell) {
      delete merged.renderCell;
    }
    return merged;
  };

  // Build a map of all effective columns by id (defaults + user extra columns)
  const effectiveById = {};
  const allIds = new Set([...Object.keys(defaultById), ...Object.keys(userById)]);
  for (const id of allIds) {
    effectiveById[id] = mergeColumn(defaultById[id], userById[id]);
  }

  // 1) Columns in the order the user specified (for both defaults and extras)
  const orderedFromUser = userColumns.map((c) => effectiveById[c.id]).filter(Boolean);

  // 2) Any remaining default columns that the user did *not* mention at all,
  //     in their original DEFAULT_COLUMNS order
  const remainingDefaults = DEFAULT_COLUMNS.filter((c) => !userById[c.id])
    .map((c) => effectiveById[c.id])
    .filter(Boolean);

  const EFFECTIVE_COLUMNS = [...orderedFromUser, ...remainingDefaults];

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
              ...(hiddenColumnIdsInMobile.indexOf(col.id) !== -1
                ? { display: { xs: "none", md: "table-cell" } } // hide “Meaning” on small devices
                : {}),
            }}
          >
            {col.header}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );

  const renderCell = (col, row) => {
    let value =
      typeof col.accessor === "function"
        ? col.accessor(row)
        : typeof col.accessor === "string"
          ? getByPath(row, col.accessor)
          : undefined;
    if (typeof col.formatter === "function") {
      value = col.formatter(row, value);
    }

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
                    ...(hiddenColumnIdsInMobile.indexOf(col.id) !== -1
                      ? { display: { xs: "none", md: "table-cell" } } // hide “Meaning” on small devices
                      : {}),
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
          overflowX: "auto",
          overflowY: "hidden",
          maxWidth: "100%",
          position: { xs: "static", sm: "relative" },
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
            tableLayout: { xs: "auto", sm: "fixed" },
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
  header: PropTypes.node,
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
    PropTypes.oneOf(["id", "source", "measure", "lastAssessed", "score", "numAnswered", "scoreMeaning", "comparison"]),
  ),
  columns: PropTypes.arrayOf(columnShape),
  emptyMessage: PropTypes.string,
  tableStyle: PropTypes.object,
  containerStyle: PropTypes.object,
};
