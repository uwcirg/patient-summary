import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import ResponsesTable from "./ResponsesTable";

export default function PrintChunks({ section }) {
  if (!section || !section.tables) return null;
  return (
    <Box className="print-only print-table-chunk" aria-hidden="true">
      {section.tables.flatMap((table) =>
        (table.rows ?? []).flatMap((row) =>
          (row.printColumnChunks ?? []).map((chunk, i) => (
            <ResponsesTable
              key={`${row.id}_chunk_${i}`}
              columns={chunk.columns}
              tableData={row.tableResponseData}
              title={`${row.title} History${i > 0 ? " (cont'd)" : ""}`}
              tableProps = {{
                "aria-hidden": "true"
              }}
            />
          )),
        ),
      )}
    </Box>
  );
}

PrintChunks.propTypes = {
  section: PropTypes.object,
};
