import React, { useMemo } from "react";
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

/**
 * Auto-generate simple columns array from the first row of data
 */
function buildBasicColumns(tableData) {
  if (!Array.isArray(tableData) || tableData.length === 0) return [];
  const first = tableData[0];
  return Object.keys(first).map((key) => ({
    title: key,
    field: key,
  }));
}

const safeGet = (row, field) => {
  if (!field) return undefined;
  return String(field)
    .split(".")
    .reduce((acc, k) => (acc == null ? acc : acc[k]), row);
};

function normalizeCell(v) {
  if (v == null || v === "null" || v === "undefined") return "N/A";
  if (typeof v === "string" || typeof v === "number") return v;
  if (React.isValidElement(v)) return v;
  if (Array.isArray(v)) return v.join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default function ResponsesTable({
  tableData = [],
  title,
  columns,
  buildColumns, // optional: () => columns[]
  headerBgColor = "#FFF",
  containerStyle,
  wrapDefaultRender = true,
  dense = true,
  stickyHeader = true,
}) {
  const theme = useTheme();
  const STICKY_FIRST_COL_LEFT = 0;
  const Z_HEADER = 3;
  const Z_FIRST_COL = 2;
  const Z_CORNER = 4; // top-left cell (header + first col)
  const BORDER_COLOR = "#f4f0f0";

  // resolve columns in priority order:
  // 1) explicit columns prop
  // 2) buildColumns() if provided
  // 3) basic columns inferred from data
  const resolvedColumns = useMemo(() => {
    if (Array.isArray(columns) && columns.length > 0) return columns;

    if (typeof buildColumns === "function") {
      const c = buildColumns();
      if (Array.isArray(c) && c.length > 0) return c;
    }

    return buildBasicColumns(tableData);
  }, [columns, buildColumns, tableData]);

  // Apply safe default render unless column.render exists
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
    <Box
      className="responses-container"
      sx={{
        borderRadius: 0,
        mx: "auto",
        p: theme.spacing(2),
        width: "100%",
        [theme.breakpoints.up("md")]: { width: "95%" },
        [theme.breakpoints.up("lg")]: { width: "85%" },
        overflowX: "auto",
        overflowY: "auto",
        position: "relative",
        ...(containerStyle || {}),
      }}
    >
      {title && (
        <Typography
          variant="subtitle2"
          component="h3"
          sx={{
            marginBottom: 1,
          }}
        >
          {title}
        </Typography>
      )}
      <TableContainer
        className="table-container"
        component={Paper}
        elevation={1}
        sx={{
          maxHeight: "calc(100vh - 120px)", // leave room for AppBar
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
                    sx={{
                      backgroundColor: headerBgColor,
                      top: 0,
                      zIndex: isFirstCol ? Z_CORNER : Z_HEADER,

                      ...(isFirstCol
                        ? {
                            position: "sticky",
                            left: STICKY_FIRST_COL_LEFT,
                          }
                        : { borderRight: `1px solid ${BORDER_COLOR}` }),

                      ...(col.headerStyle || {}),
                    }}
                  >
                    {col.title}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody>
            {(tableData ?? []).map((row, rowIndex) => (
              <TableRow key={row?.id ?? rowIndex} hover>
                {safeColumns.map((col, colIndex) => {
                  const content =
                    typeof col.render === "function"
                      ? col.render(row, rowIndex)
                      : normalizeCell(safeGet(row, col.field));
                  const isFirstCol = colIndex === 0;
                  if (col.spanFullRow || row.readOnly) {
                    if (isFirstCol) {
                      return (
                        <TableCell
                          key={`${row?.id ?? rowIndex}-readonly`}
                          colSpan={safeColumns.length}
                          className="read-only"
                          sx={{
                            backgroundColor: "#f7f9f9",
                            ...(col.readonlyCellStyle || {}),
                          }}
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
                              backgroundColor: "#fff",
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
  columns: PropTypes.array, // [{ title, field, render?, align?, headerSx?, cellSx? }]
  buildColumns: PropTypes.func,
  headerBgColor: PropTypes.string,
  containerStyle: PropTypes.object,
  wrapDefaultRender: PropTypes.bool,
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  title: PropTypes.string,
};
