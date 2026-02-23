import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// ─── Module-level constants ───────────────────────────────────────────────────
const Z_HEADER = 3;
const Z_FIRST_COL = 2;
const Z_CORNER = 4;
const STICKY_FIRST_COL_LEFT = 0;
const BORDER_COLOR = "#f4f0f0";
const READONLY_BG_COLOR = "#f7f9f9";
const FIRST_COL_BG_COLOR = "#fff";
const TABLE_MAX_HEIGHT = "calc(100vh - 120px)";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildBasicColumns(tableData) {
  if (!Array.isArray(tableData) || tableData.length === 0) return [];
  return Object.keys(tableData[0]).map((key) => ({ title: key, field: key }));
}

const safeGet = (row, field) => {
  if (!field) return undefined;
  return String(field)
    .split(".")
    .reduce((acc, k) => (acc == null ? acc : acc[k]), row);
};

function normalizeCell(v) {
  if (v == null || v === "null" || v === "undefined") return "-";
  if (typeof v === "string" || typeof v === "number") return v;
  if (React.isValidElement(v)) return v;
  if (Array.isArray(v)) return v.join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResponsesTable({
  tableData = [],
  title,
  columns,
  /**
   * Optional function to build columns dynamically.
   * Should be memoized by the caller (e.g. via useMemo or useCallback)
   * to avoid unnecessary recomputation on every render.
   */
  buildColumns,
  headerBgColor = "#FFF",
  containerStyle,
  wrapDefaultRender = true,
  dense = true,
  stickyHeader = true,
}) {
  const theme = useTheme();

  const resolvedColumns = useMemo(() => {
    if (Array.isArray(columns) && columns.length > 0) return columns;

    if (typeof buildColumns === "function") {
      const c = buildColumns();
      if (Array.isArray(c) && c.length > 0) return c;
    }

    return buildBasicColumns(tableData);
  }, [columns, buildColumns, tableData]);

  const safeColumns = useMemo(() => {
    const cols = Array.isArray(resolvedColumns) ? resolvedColumns : [];
    if (!wrapDefaultRender) return cols;

    return cols.map((col) => {
      if (typeof col?.render === "function") return col;
      return {
        ...col,
        render: (rowData) => normalizeCell(safeGet(rowData, col.field)),
      };
    });
  }, [resolvedColumns, wrapDefaultRender]);

  return (
    // Outer Box handles layout only — scroll is owned by TableContainer
    <Box
      className="responses-container"
      sx={{
        borderRadius: 0,
        mx: "auto",
        p: theme.spacing(2),
        width: "100%",
        [theme.breakpoints.up("md")]: { width: "95%" },
        [theme.breakpoints.up("lg")]: { width: "85%" },
        position: "relative",
        ...(containerStyle || {}),
      }}
    >
      {title && (
        <Typography
          variant="subtitle2"
          component="h3"
          sx={{ marginBottom: 1 }}
        >
          <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(title) }} />
        </Typography>
      )}

      <TableContainer
        className="table-container"
        component={Paper}
        elevation={1}
        sx={{
          maxHeight: TABLE_MAX_HEIGHT,
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
        <Table size={dense ? "small" : "medium"} stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {safeColumns.map((col, colIndex) => {
                const isFirstCol = colIndex === 0;
                return (
                  <TableCell
                    key={col.field ?? col.title ?? colIndex}
                    align={col.align || "left"}
                    variant="head"
                    sx={{
                      backgroundColor: headerBgColor,
                      top: 0,
                      zIndex: isFirstCol ? Z_CORNER : Z_HEADER,
                      ...(isFirstCol
                        ? { position: "sticky", left: STICKY_FIRST_COL_LEFT }
                        : { borderRight: `1px solid ${BORDER_COLOR}` }),
                      ...(col.headerStyle || {}),
                    }}
                  >
                    {/* Column titles are developer-supplied, rendered as plain text */}
                    {col.title}
                    {col.source && (
                      <span className="source-container">{col.source}</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {(tableData ?? []).map((row, rowIndex) => (
              <TableRow key={row?.id ?? rowIndex}>
                {safeColumns.map((col, colIndex) => {
                  const content =
                    typeof col.render === "function"
                      ? col.render(row, rowIndex)
                      : normalizeCell(safeGet(row, col.field));
                  const isFirstCol = colIndex === 0;

                  // row.readOnly: the entire row spans all columns with readonly styling
                  if (row.readOnly) {
                    if (isFirstCol) {
                      return (
                        <TableCell
                          key={`${row?.id ?? rowIndex}-readonly`}
                          colSpan={safeColumns.length}
                          className="read-only"
                          sx={{
                            backgroundColor: READONLY_BG_COLOR,
                            ...(col.readonlyCellStyle || {}),
                          }}
                        >
                          {content}
                        </TableCell>
                      );
                    }
                    return null;
                  }

                  // col.spanFullRow: this column's content spans all columns for this row
                  if (col.spanFullRow) {
                    if (isFirstCol) {
                      return (
                        <TableCell
                          key={`${row?.id ?? rowIndex}-spanfull`}
                          colSpan={safeColumns.length}
                          sx={{ ...(col.cellStyle || {}) }}
                        >
                          {content}
                        </TableCell>
                      );
                    }
                    return null;
                  }

                  return (
                    <TableCell
                      key={`${row?.id ?? rowIndex}-${col.field ?? col.title ?? colIndex}`}
                      align={col.align || "left"}
                      sx={{
                        ...(isFirstCol
                          ? {
                              position: "sticky",
                              left: STICKY_FIRST_COL_LEFT,
                              zIndex: Z_FIRST_COL,
                              backgroundColor: FIRST_COL_BG_COLOR,
                            }
                          : { borderRight: `1px solid ${BORDER_COLOR}` }),
                        ...(col.cellStyle || {}),
                      }}
                    >
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {(!tableData || tableData.length === 0) && (
              <TableRow>
                <TableCell colSpan={safeColumns.length || 1}>N/A</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

ResponsesTable.propTypes = {
  tableData: PropTypes.array,
  /**
   * Explicit columns array. Takes priority over buildColumns and auto-inference.
   * Shape: [{ title, field, render?, align?, headerStyle?, cellStyle?, readonlyCellStyle?, source?, spanFullRow? }]
   */
  columns: PropTypes.array,
  /**
   * Function that returns a columns array. Used if columns prop is not provided.
   * Should be memoized by the caller to avoid unnecessary recomputation.
   */
  buildColumns: PropTypes.func,
  headerBgColor: PropTypes.string,
  containerStyle: PropTypes.object,
  wrapDefaultRender: PropTypes.bool,
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  title: PropTypes.string,
};
