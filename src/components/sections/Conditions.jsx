import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import MaterialTable from "@material-table/core";
import TableContainer from "@mui/material/TableContainer";
import Condition from "@/models/Condition";
import Error from "@/components/ErrorComponent";
import { isEmptyArray } from "@/util";

export default function Conditions(props) {
  const theme = useTheme();
  const bgColor =
    theme && theme.palette && theme.palette.lightest && theme.palette.lightest.main
      ? theme.palette.lightest.main
      : "#FFF";
  const { data } = props;
  const getData = (data) => {
    if (!data) return null;
    const goodData = Condition.getGoodData(data);
    return goodData
      .map((item) => {
        const o = new Condition(item);
        return o.toObj();
      })
      .sort((a, b) => {
        return new Date(b.onsetDateTime).getTime() - new Date(a.onsetDateTime).getTime();
      });
  };
  const results = getData(data);
  const columns = [
    {
      title: "ID",
      field: "id",
      hidden: true,
    },
    {
      title: "Condition",
      field: "condition",
    },
    {
      title: "Onset Date",
      field: "onsetDateTime",
    },
    {
      title: "Recorded Date",
      field: "recordedDate",
    },
    {
      title: "Status",
      field: "status",
      emptyText: "--",
      render: (rowData) =>
        String(rowData.status).toLowerCase() === "confirmed" ? (
          <span className="text-success">{rowData.status}</span>
        ) : (
          <span className="text-error">{rowData.status}</span>
        ),
    },
  ];
  const renderPrintView = (data) => {
    const displayColumns = columns.filter((column) => !column.hidden);
    return (
      <table>
        <thead>
          <tr>
            {displayColumns.map((column, index) => (
              <th key={`print_head_${index}`}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((result, index) => {
            return (
              <tr key={`print_row_${index}`}>
                {displayColumns.map((column, index) => (
                  <td key={`print_cell_${index}`}>{result[column.field]}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };
  if (data?.error) {
    return <Error message={data.error}></Error>;
  }
  if (isEmptyArray(results))
    return (
      <Alert severity="warning" className="condition-no-data">
        No recorded condition
      </Alert>
    );
  return (
    <>
      <TableContainer
        className="print-hidden"
        sx={{
          maxWidth: {
            xs: "460px",
            sm: "100%",
          },
        }}
      >
        <MaterialTable
          columns={columns}
          data={getData(data)}
          options={{
            search: false,
            showTitle: false,
            toolbar: false,
            padding: "dense",
            headerStyle: {
              backgroundColor: bgColor,
            },
          }}
        ></MaterialTable>
      </TableContainer>
      <div className="print-only">{renderPrintView(results)}</div>
    </>
  );
}

Conditions.propTypes = {
  data: PropTypes.array,
};
