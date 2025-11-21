import React, { useMemo, useState, forwardRef } from "react";
import PropTypes from "prop-types";
import { AppBar, Box, Button, Dialog, IconButton, Paper, Slide, Stack, Toolbar, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import MaterialTable from "@material-table/core";

/**
 * Local transition for the full-screen dialog
 */
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * Auto-generate a simple columns array from the first row of data
 * Only used when `columns` prop is not provided.
 */
function buildBasicColumns(tableData) {
  if (!Array.isArray(tableData) || tableData.length === 0) return [];
  const first = tableData[0];
  return Object.keys(first).map((key) => ({
    title: key,
    field: key,
  }));
}

export default function ResponsesViewer({
  title,
  subtitle,
  tableData = [],
  columns,
  headerBgColor,
  // buttonLabel = "View",
  // Optional advanced mode:
  buildColumns, // (optional) function: () => columns[]
  responsesTileTitle = "Responses", // header above the button, mirrors your summary tile
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const resolvedHeaderBg = headerBgColor ?? (theme?.palette?.lightest?.main ? theme.palette.lightest.main : "#FFF");

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

  const safeGet = (row, field) => {
    if (!field) return undefined;
    // support nested fields like "a.b.c"
    return field.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), row);
  };

  // wherever you compute columns in ResponsesViewer:
  const safeColumns = React.useMemo(() => {
    const cols = Array.isArray(resolvedColumns) ? resolvedColumns : [];
    return cols.map((col) => {
      // If a custom render exists, assume it knows what to do.
      if (typeof col.render === "function") return col;

      // Otherwise, provide a safe default that coerces the raw value.
      return {
        ...col,
        render: (rowData) => normalizeCell(safeGet(rowData, col.field)),
      };
    });
  }, [resolvedColumns]);

  // Forward the ref so MaterialTable can measure scrollWidth
  const MTContainer = forwardRef(function MTContainer(props, ref) {
    return <Paper ref={ref} className="table-root" elevation={1} {...props} />;
  });

  return (
    <>
      <Stack direction={"column"} justifyContent={"space-between"} alignItems={"center"} gap={1}>
        <Box>
          <Typography variant="subtitle2" sx={{ textAlign: "center"}}>
            {responsesTileTitle}
          </Typography>
          {subtitle && <Typography variant="caption">{subtitle}</Typography>}
        </Box>
        <Button
          color="link"
          title="View responses by date"
          size="small"
          onClick={() => setOpen(true)}
          variant="outlined"
          sx={{fontSize: "0.8rem"}}
        >
          View
        </Button>
      </Stack>

      {/* Full-screen dialog */}
      <Dialog
        fullScreen
        open={open}
        onClose={() => setOpen(false)}
        TransitionComponent={Transition}
        transitionDuration={{ enter: 500, exit: 500 }}
      >
        <AppBar sx={{ position: "relative", minHeight: "48px" }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setOpen(false)} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              {title}
            </Typography>
            <Button color="inherit" onClick={() => setOpen(false)}>
              Close
            </Button>
          </Toolbar>
        </AppBar>

        {/* Table inside the dialog */}
        <Box
          className="responses-container"
          sx={{
            borderRadius: 0,
            mx: "auto",
            p: theme.spacing(2),
            width: "100%",
            [theme.breakpoints.up("md")]: { width: "95%" },
            [theme.breakpoints.up("lg")]: { width: "80%" },
            overflowX: "auto",
            position: "relative",
          }}
        >
          <MaterialTable
            components={{
              Container: MTContainer,
            }}
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
                backgroundColor: resolvedHeaderBg,
                position: "sticky",
                top: 0,
                zIndex: 998,
                borderRight: "1px solid #ececec",
              },
              rowStyle: (rowData) => ({
                backgroundColor: rowData.tableData.index % 2 === 0 ? "#f4f4f6" : "#fff",
              }),
            }}
          />
        </Box>
      </Dialog>
    </>
  );
}

ResponsesViewer.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  tableData: PropTypes.array,
  columns: PropTypes.array, // optional, if omitted we'll auto-build simple columns
  headerBgColor: PropTypes.string, // optional
  buttonLabel: PropTypes.string, // optional ("View" default)
  buildColumns: PropTypes.func, // optional advanced hook to compute columns
  responsesTileTitle: PropTypes.node, // optional ("Responses" default)
};
