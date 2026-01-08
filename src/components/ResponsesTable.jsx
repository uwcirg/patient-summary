import React, { forwardRef, useMemo } from "react";
import PropTypes from "prop-types";
import { Box, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MaterialTable from "@material-table/core";

// Forward the ref so MaterialTable can measure scrollWidth
const MTContainer = forwardRef(function MTContainer(props, ref) {
  return <Paper ref={ref} className="table-root" elevation={1} {...props} />;
});

/**
 * Auto-generate a simple columns array from the first row of data
 * Only used when `columns` prop is not provided and buildColumns returns nothing.
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
  // support nested fields like "a.b.c"
  return String(field)
    .split(".")
    .reduce((acc, k) => (acc == null ? acc : acc[k]), row);
};

// normalize anything to a renderable node
function normalizeCell(v) {
  if (v == null || v === "null" || v === "undefined") return "N/A";
  if (typeof v === "string" || typeof v === "number") return v;
  if (React.isValidElement(v)) return v;
  if (Array.isArray(v)) return v.join(", ");
  try {
    return JSON.stringify(v); // last resort for objects
  } catch {
    return String(v);
  }
}

export default function ResponsesTable({
  title,
  tableData = [],
  columns,
  buildColumns, // optional: () => columns[]
  headerBgColor = "#FFF",
  boxSx,
  tableOptions,
  wrapDefaultRender = true, // allow opting out if needed
}) {
  const theme = useTheme();

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

  // safe default render wrapper
  const safeColumns = useMemo(() => {
    const cols = Array.isArray(resolvedColumns) ? resolvedColumns : [];
    if (!wrapDefaultRender) return cols;

    return cols.map((col) => {
      // If a custom render exists, assume it knows what to do.
      if (typeof col?.render === "function") return col;

      // Otherwise, provide a safe default that coerces the raw value.
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
        position: "relative",
        ...(boxSx || {}),
      }}
    >
      {title && (
        <Typography component="h3" variant="subtitle2" sx={{ textAlign: "left", marginBottom: 1 }}>
          {title}
        </Typography>
      )}
      <MaterialTable
        components={{ Container: MTContainer }}
        columns={safeColumns}
        data={tableData ?? []}
        options={{
          search: false,
          showTitle: false,
          padding: "dense",
          toolbar: false,
          paging: false,
          thirdSortClick: false,
          headerStyle: {
            backgroundColor: headerBgColor,
            position: "sticky",
            top: 0,
            zIndex: 998,
            borderRight: "2px solid #ececec",
          },
          ...(tableOptions || {}),
        }}
      />
    </Box>
  );
}

ResponsesTable.propTypes = {
  title: PropTypes.string,
  tableData: PropTypes.array,
  columns: PropTypes.array,
  buildColumns: PropTypes.func,
  headerBgColor: PropTypes.string,
  boxSx: PropTypes.object,
  tableOptions: PropTypes.object,
  wrapDefaultRender: PropTypes.bool,
};
