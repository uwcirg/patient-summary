import {useEffect} from "react";
import PropTypes from "prop-types";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";

// const paginationModel = { page: 0, pageSize: 5 };

export default function SimpleTable({ rows, columns }) {
    const apiRef = useGridApiRef();
    useEffect(() => {
        if (apiRef.current && rows.length > 0) {
          apiRef.current.autosizeColumns({
            includeHeaders: true, // Consider header content for width calculation
            // You can also specify a specific column to autosize:
            // columns: ['myColumnField'],
          });
        }
      }, [rows, apiRef]);
  return (
    <Paper sx={{ margin: (theme) => theme.spacing(1, 2, 2) }} elevation={0}>
      <DataGrid
        apiRef={apiRef}
        rows={rows}
        columns={columns}
        // initialState={{ pagination: { paginationModel } }}
        // pageSizeOptions={[5, 10]}
        // checkboxSelection
        density="compact"
        columnHeaderHeight={40}
        hideFooter={true}
        sx={{
            border: 1
        }}
      />
    </Paper>
  );
}

SimpleTable.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.array,
};
