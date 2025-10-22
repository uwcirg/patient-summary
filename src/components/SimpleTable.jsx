import * as React from "react";
import PropTypes from "prop-types";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
//import Paper from "@mui/material/Paper";

export default function SimpleTable({ rows, columns }) {
  const cellStyle = {
    borderRight: `1px solid`,
    borderColor: "border.main",
  };
  return (
    <TableContainer>
      <Table sx={{ width: "auto", border: "1px solid #ececec" }} size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: "lightest.main" }}>
            {columns.map((column) => {
              return <TableCell key={column.field}>{column.headername}</TableCell>;
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const keys = Object.keys(row).filter((key) => key !== "id");
            return (
              <TableRow key={row.id} sx={{ "&:last-child td, &:last-child th": { borderRight: 0 } }}>
                {keys.map((key, index) => (
                  <TableCell key={`cell_${row.id}_${key}`} sx={{ ...cellStyle, fontWeight: index === 0 ? 500 : 400 }}>
                    {row[key]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

SimpleTable.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.array,
};
