import * as React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Error from "@/components/ErrorComponent";
import DataTable from "@/components/DataTable";
import { isEmptyArray } from "@/util";

export default function Conditions(props) {
  const { data } = props;

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

  if (isEmptyArray(data))
    return (
      <Alert severity="warning" className="condition-no-data">
        No recorded condition
      </Alert>
    );

  return (
    <>
      <DataTable columns={columns} data={data} />
      <div className="print-only">{renderPrintView(data)}</div>
    </>
  );
}

Conditions.propTypes = {
  data: PropTypes.array,
};
