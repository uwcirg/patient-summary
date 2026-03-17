import React, { useMemo } from "react";
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
import Typography from "@mui/material/Typography";
import Scoring from "@components/Score";
import { isEmptyArray, isNil, scrollToAnchor } from "@util";
import InfoDialog from "../InfoDialog";
import ResponsesViewer from "../ResponsesViewer";
import Meaning from "../Meaning";
import { getNoDataDisplay } from "../../models/resultBuilders/helpers";

// ─── Module-level constants ───────────────────────────────────────────────────
const HIDDEN_COLUMN_IDS_IN_MOBILE = ["numAnswered"];

const DEFAULT_TABLE_CELL_PROPS = { size: "small" };
const DEFAULT_HEADER_CELL_PROPS = {
  ...DEFAULT_TABLE_CELL_PROPS,
  align: "center",
  variant: "head",
};
const CELL_WHITESPACE_STYLE = { wordBreak: "break-word", whiteSpace: "normal" };

const STICKY_STYLE = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  backgroundColor: "#FFF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getByPath = (obj, path) => {
  if (typeof path !== "string") return undefined;
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
};

const normalizeToArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data) return [data];
  return [];
};

const getTextClassName = (row) => {
  if (row.alert) return "text-error";
  if (row.warning) return "text-warning";
  return "";
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function TableHeader({ visibleColumns, baseCellStyle }) {
  return (
    <TableHead>
      <TableRow sx={{ backgroundColor: "lightest.main" }}>
        {visibleColumns.map((col) => (
          <TableCell
            key={`header_${col.id}`}
            {...DEFAULT_HEADER_CELL_PROPS}
            align={col.align || DEFAULT_HEADER_CELL_PROPS.align}
            {...(col.headerProps || {})}
            sx={{
              ...baseCellStyle,
              ...(col.sticky ? STICKY_STYLE : {}),
              ...(col.headerProps?.sx || {}),
              ...(col.width ? { width: col.width } : {}),
              ...(HIDDEN_COLUMN_IDS_IN_MOBILE.includes(col.id) ? { display: { xs: "none", md: "table-cell" } } : {}),
            }}
          >
            {col.header}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

TableHeader.propTypes = {
  visibleColumns: PropTypes.array.isRequired,
  baseCellStyle: PropTypes.object.isRequired,
};

function TableBodyRows({ visibleColumns, dataToUse, baseCellStyle, emptyMessage, renderCell }) {
  const hasData = dataToUse.length > 0;

  return (
    <TableBody>
      {hasData ? (
        dataToUse.map((row, index) => {
          const noRowData = isEmptyArray(row.tableResponseData);
          return (
            <TableRow key={`summary_${row.key || index}_${index}`}>
              {visibleColumns.map((col, colIndex) => (
                <TableCell
                  key={`cell_${col.id}_${row.key || index}`}
                  {...DEFAULT_TABLE_CELL_PROPS}
                  align={col.align || "left"}
                  {...(col.cellProps || {})}
                  sx={{
                    ...baseCellStyle,
                    ...(col.sticky ? STICKY_STYLE : {}),
                    ...(col.cellProps?.sx || {}),
                    ...(HIDDEN_COLUMN_IDS_IN_MOBILE.includes(col.id)
                      ? { display: { xs: "none", md: "table-cell" } }
                      : {}),
                  }}
                >
                  {noRowData && colIndex > 0 ? emptyMessage || getNoDataDisplay() : renderCell(col, row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })
      ) : (
        <TableRow>
          <TableCell
            colSpan={visibleColumns.length}
            align="center"
            sx={{
              ...baseCellStyle,
              position: "static",
              backgroundColor: "transparent",
              fontStyle: "italic",
              color: "text.secondary",
            }}
          >
            {emptyMessage || getNoDataDisplay()}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}

TableBodyRows.propTypes = {
  visibleColumns: PropTypes.array.isRequired,
  dataToUse: PropTypes.array.isRequired,
  baseCellStyle: PropTypes.object.isRequired,
  emptyMessage: PropTypes.string,
  renderCell: PropTypes.func.isRequired,
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function ScoringSummary({
  data,
  disableLinks,
  enableResponsesViewer,
  hiddenColumns = [],
  columns = [],
  emptyMessage,
  tableStyle,
  containerStyle,
}) {
  const theme = useTheme();

  // ---- styles (theme-dependent, memoized)
  const baseCellStyle = useMemo(
    () => ({
      borderRight: "1px solid",
      borderColor: "border.main",
      whiteSpace: { xs: "normal", sm: "nowrap" },
      lineHeight: 1.4,
      fontSize: { xs: "0.75rem", sm: "0.8rem" },
      padding: theme.spacing(1),
      verticalAlign: "top",
      ...CELL_WHITESPACE_STYLE,
    }),
    [theme],
  );

  // ---- renderers (memoized; depend on disableLinks + enableResponsesViewer)
  const defaultRenderers = useMemo(
    () => ({
      text: (row, value) => (value ? <span className={getTextClassName(row)}>{value}</span> : getNoDataDisplay()),

      date: (row) => (
        <Stack direction="column" spacing={1} alignItems="space-between" justifyContent="space-between">
          <Box>{row.displayDate}</Box>
          {row.source && <Box className="muted-text source-container">{row.source}</Box>}
        </Stack>
      ),

      // "answered" is used directly inside scoreMeaning's renderCell, not via type dispatch.
      // Kept here for co-location but not exposed as a column type in columnShape.
      answered: (row) => {
        if (row.totalAnsweredItems != null || row.note) {
          return (
            <Stack direction="row" alignItems={"center"}>
              {row.totalAnsweredItems && (
                <Box>{`${row.totalAnsweredItems} question${row.totalAnsweredItems > 1 ? "s" : ""} answered`}</Box>
              )}
              {row.note && (
                <InfoDialog
                  title={`About ${row.title} Scoring`}
                  content={row.note}
                  buttonTitle={`Click to learn more about ${row.title} scoring`}
                  allowHtml={true}
                  buttonSize="small"
                  buttonIconProps={{ fontSize: "small" }}
                />
              )}
            </Stack>
          );
        }
        return null;
      },

      score: (row) => (
        <Stack
          direction="column"
          spacing={0.75}
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ width: "100%" }}
          className="score-wrapper"
        >
          <Scoring
            score={row.score}
            scoreParams={{ ...row, ...(row.scoringParams ?? {}) }}
            justifyContent="space-between"
          />
          <Box className="no-wrap-text muted-text" sx={{ fontSize: "0.7rem" }}>
            {row.scoreRangeDisplay}
          </Box>
        </Stack>
      ),
    }),
    [], // no deps: renderers don't close over changing props directly
  );

  const handleClick = (e, anchorElementId) => {
    e.preventDefault();
    scrollToAnchor(anchorElementId);
  };

  // ---- DEFAULT_COLUMNS (memoized; depends on theme, disableLinks, enableResponsesViewer, baseCellStyle)
  const DEFAULT_COLUMNS = useMemo(
    () => [
      {
        id: "measure",
        header: "Measure",
        sticky: true,
        align: "left",
        headerProps: {
          sx: {
            ...STICKY_STYLE,
            minHeight: { xs: theme.spacing(4), sm: "auto" },
            backgroundColor: "lightest.main",
            textAlign: "left",
          },
          ...DEFAULT_HEADER_CELL_PROPS,
        },
        cellProps: {
          sx: {
            ...baseCellStyle,
            ...STICKY_STYLE,
            fontWeight: 500,
            borderBottom: "1px solid",
            borderBottomColor: "border.main",
            verticalAlign: "top",
            textAlign: "left",
            minWidth: "128px",
          },
          size: "small",
        },
        renderCell: (row) => {
          const title = row.rowTitle ?? row.title;
          if (!disableLinks) {
            return (
              <Link
                onClick={(e) => handleClick(e, row.key)}
                underline="none"
                sx={{ color: "link.main", cursor: "pointer" }}
                href={`#${row.key}`}
                className="instrument-link"
              >
                {title} {row.subtitle ?? ""}
              </Link>
            );
          }
          if (enableResponsesViewer && !isEmptyArray(row?.tableResponseData)) {
            return (
              <ResponsesViewer
                title={title}
                subtitle={row.subtitle}
                note={row.note}
                responsesTileTitle={row.rowTitle}
                tableData={row?.tableResponseData}
                columns={row?.responseColumns}
                questionnaire={row.questionnaire}
                buttonStyle={{ width: "100%", maxWidth: 88 }}
              />
            );
          }
          return (
            <Typography component="h3" variant="subtitle2" sx={{ textAlign: "left" }}>
              {title}
            </Typography>
          );
        },
      },
      {
        id: "numAnswered",
        header: "Answered",
        align: "center",
        width: "15%",
        headerProps: { sx: { ...baseCellStyle }, ...DEFAULT_HEADER_CELL_PROPS },
        cellProps: { sx: { ...baseCellStyle, whiteSpace: "nowrap" } },
        size: "small",
        renderCell: (row) =>
          row.numAnsweredDisplay
            ? row.numAnsweredDisplay
            : row.hasData != null && !row.hasData
              ? getNoDataDisplay()
              : defaultRenderers.text(row, ""),
      },
      {
        id: "scoreMeaning",
        header: "Score / Meaning",
        align: "left",
        headerProps: { sx: baseCellStyle, ...DEFAULT_HEADER_CELL_PROPS, align: "left" },
        cellProps: { sx: { ...baseCellStyle, whiteSpace: "normal" }, size: "small" },
        renderCell: (row) => {
          if (isNil(row.score) && isNil(row.meaning)) return getNoDataDisplay();
          return (
            <Stack sx={{ width: "100%" }} spacing={1.25} alignItems="flex-start" justifyContent="flex-start">
              {!row.displayMeaningNotScore && defaultRenderers.score(row)}
              {row.showNumAnsweredWithScore && defaultRenderers.answered(row)}
              <Meaning id={row.id ?? row.key} meaning={row.meaning} alert={row.alert} warning={row.warning} />
            </Stack>
          );
        },
      },
      {
        id: "lastAssessed",
        header: "Last Done",
        align: "center",
        type: "date",
        headerProps: { sx: baseCellStyle, ...DEFAULT_HEADER_CELL_PROPS },
        cellProps: { sx: baseCellStyle, size: "small" },
        accessor: (row) => row.lastAssessed ?? row.date ?? "",
      },
      {
        id: "comparison",
        header: "Change from Last",
        align: "center",
        headerProps: { sx: { ...baseCellStyle, borderRightWidth: 0 }, ...DEFAULT_HEADER_CELL_PROPS },
        cellProps: { sx: { ...baseCellStyle, borderRightWidth: 0 }, size: "small" },
        renderCell: (row) => row.comparisonIcon,
      },
    ],
    [theme, baseCellStyle, disableLinks, enableResponsesViewer, defaultRenderers],
  );

  // ---- column merging (memoized; depends on columns + DEFAULT_COLUMNS)
  const EFFECTIVE_COLUMNS = useMemo(() => {
    const userColumns = Array.isArray(columns) ? columns : [];
    const defaultById = Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.id, c]));
    const userById = Object.fromEntries(userColumns.map((c) => [c.id, c]));

    const mergeColumn = (defaultCol, userCol) => {
      if (!defaultCol && !userCol) return null;
      const merged = defaultCol ? { ...defaultCol, ...(userCol || {}) } : { ...userCol };
      // If a new accessor or type but no renderCell is supplied,
      // drop the default renderCell to let type/accessor drive rendering.
      if (userCol && (userCol.accessor || userCol.type) && !userCol.renderCell) {
        delete merged.renderCell;
      }
      return merged;
    };

    const effectiveById = {};
    const allIds = new Set([...Object.keys(defaultById), ...Object.keys(userById)]);
    for (const id of allIds) {
      effectiveById[id] = mergeColumn(defaultById[id], userById[id]);
    }

    const orderedFromUser = userColumns.map((c) => effectiveById[c.id]).filter(Boolean);
    const remainingDefaults = DEFAULT_COLUMNS.filter((c) => !userById[c.id])
      .map((c) => effectiveById[c.id])
      .filter(Boolean);

    return [...orderedFromUser, ...remainingDefaults];
  }, [columns, DEFAULT_COLUMNS]);

  // ---- column visibility
  const isColVisible = (id) => {
    if (id === "measure") return true;
    return !hiddenColumns?.includes(id);
  };

  const allVisibleColumns = EFFECTIVE_COLUMNS.filter((c) => isColVisible(c.id));
  const firstColumn = EFFECTIVE_COLUMNS.find((c) => c.id === "measure") || EFFECTIVE_COLUMNS[0];

  const NO_DATA_COLUMN = {
    id: "__noData",
    header: "No Data",
    align: "center",
    headerProps: { sx: baseCellStyle, ...DEFAULT_HEADER_CELL_PROPS },
    cellProps: { sx: baseCellStyle, size: "small" },
    renderCell: () => (
      <Box className="muted-text text-center" sx={{ fontStyle: "italic" }}>
        {getNoDataDisplay()}
      </Box>
    ),
  };

  const visibleColumns =
    allVisibleColumns.length === 0
      ? firstColumn
        ? [firstColumn, NO_DATA_COLUMN]
        : [NO_DATA_COLUMN]
      : allVisibleColumns;

  // ---- cell rendering
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

  const dataToUse = normalizeToArray(data);

  return (
    <Stack className="scoring-summary-container" spacing={1} direction="column" sx={containerStyle ?? {}}>
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
            ...(tableStyle ?? {}),
          }}
          size="small"
          aria-label="scoring summary table"
          className="scoring-summary-table"
        >
          <TableHeader visibleColumns={visibleColumns} baseCellStyle={baseCellStyle} />
          <TableBodyRows
            visibleColumns={visibleColumns}
            dataToUse={dataToUse}
            baseCellStyle={baseCellStyle}
            emptyMessage={emptyMessage}
            renderCell={renderCell}
          />
        </Table>
      </TableContainer>
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
  // "answered" is intentionally excluded — it is not dispatched via type, only called directly
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
  questionnaires: PropTypes.array,
};
