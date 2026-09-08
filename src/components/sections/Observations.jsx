import * as React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Error from "@components/ErrorComponent";
import DataTable from "@/components/DataTable";
import { isEmptyArray } from "@/util";

export default function Observations(props) {
  const { data } = props;

  const columns = [
    {
      title: "ID",
      field: "id",
      hidden: true,
    },
    {
      title: "Type",
      field: "displayText",
      emptyValue: "--",
    },
    {
      title: "Result",
      field: "valueText",
      emptyValue: "--",
    },
    {
      title: "Issued Date",
      field: "dateText",
    },
    {
      title: "Category",
      field: "category",
      emptyValue: "--",
    },
    {
      title: "Status",
      field: "status",
      emptyValue: "--",
      render: (rowData) =>
        rowData.status === "final" ? (
          <span className="text-success">{rowData.status}</span>
        ) : (
          <span className="text-warning">{rowData.status}</span>
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

  if (isEmptyArray(data))
    return (
      <Alert severity="warning" className="condition-no-data">
        No recorded observation
      </Alert>
    );

  return (
    <>
      <DataTable columns={columns} data={data} />
      <div className="print-only">{renderPrintView(data)}</div>
    </>
  );
}

Observations.propTypes = {
  data: PropTypes.array,
};
