import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";

export default function DataTable({ columns, data, maxWidth }) {
  const theme = useTheme();
  const bgColor =
    theme?.palette?.lightest?.main ?? "#FFF";

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [orderBy, setOrderBy] = React.useState("");
  const [order, setOrder] = React.useState("asc");

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (columnField) => {
    const isAsc = orderBy === columnField && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnField);
  };

  const sortData = (data, orderBy, order) => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const aValue = a[orderBy] ?? "";
      const bValue = b[orderBy] ?? "";

      if (typeof aValue === "string" && typeof bValue === "string") {
        return order === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) {
        return order === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const renderCellContent = (column, rowData) => {
    if (column.render) {
      return column.render(rowData);
    }
    const value = rowData[column.field];
    return value ?? (column.emptyValue || column.emptyText || "");
  };

  const visibleColumns = columns.filter((column) => !column.hidden);
  const sortedData = sortData(data, orderBy, order);
  const paginatedData = sortedData?.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <TableContainer
      component={Paper}
      className="print-hidden"
      sx={{
        maxWidth: maxWidth || {
          xs: "460px",
          sm: "100%",
        },
      }}
    >
      <Table size="small">
        <TableHead sx={{ backgroundColor: bgColor }}>
          <TableRow>
            {visibleColumns.map((column, index) => (
              <TableCell key={`header_${index}`}>
                <TableSortLabel
                  active={orderBy === column.field}
                  direction={orderBy === column.field ? order : "asc"}
                  onClick={() => handleRequestSort(column.field)}
                >
                  {column.title}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((row, rowIndex) => (
            <TableRow key={`row_${row.id}_${rowIndex}`}>
              {visibleColumns.map((column, colIndex) => (
                <TableCell key={`cell_${row.id}_${rowIndex}_${colIndex}`}>
                  {renderCellContent(column, row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={data.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
}

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      field: PropTypes.string.isRequired,
      hidden: PropTypes.bool,
      emptyValue: PropTypes.string,
      emptyText: PropTypes.string,
      render: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.array.isRequired,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};
