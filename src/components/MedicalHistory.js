import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import MaterialTable from "@material-table/core";
import { getCorrectedISODate } from "../util/util";

export default function MedicalHistory(props) {
  const theme = useTheme();
  const bgColor =
    theme &&
    theme.palette &&
    theme.palette.lightest &&
    theme.palette.lightest.main
      ? theme.palette.lightest.main
      : "#FFF";
  const { data } = props;
  const getData = (data) => {
    if (!data) return null;
    const goodData = data.filter(
      (item) => item.code && item.code.coding && item.code.coding.length > 0
    );
    return goodData
      .map((item, index) => {
        item.id = item.id + "_" + index;
        item.condition = item.code.coding[0].display;
        item.onsetDateTime = getCorrectedISODate(item.onsetDateTime);
        item.recordedDate = getCorrectedISODate(item.recordedDate);
        return item;
      })
      .sort((a, b) => {
        return (
          new Date(b.onsetDateTime).getTime() -
          new Date(a.onsetDateTime).getTime()
        );
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
  if (!results || !results.length)
    return (
      <Alert severity="warning" className="condition-no-data">
        No recorded condition
      </Alert>
    );
  return (
    <>
      <div className="print-hidden">
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
      </div>
      <div className="print-only">{renderPrintView(results)}</div>
    </>
  );
}

MedicalHistory.propTypes = {
  data: PropTypes.array,
};
