import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import MaterialTable from "@material-table/core";
import TableContainer from "@mui/material/TableContainer";
import { getCorrectedISODate } from "../../util/util";

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
      (item) =>
        item.resourceType === "Condition" &&
        item.code &&
        ((item.code.coding &&
          Array.isArray(item.code.coding) &&
          item.code.coding.length > 0 &&
          item.code.coding.find((o) => o.display)) ||
          item.code.text)
    );
    return goodData
      .map((item, index) => {
        item.id = item.id + "_" + index;
        const displayText = item.code.text
          ? item.code.text
          : item.code.coding.map((o) => o.display).join(", ");
        item.condition = displayText || "--";
        item.onsetDateTime = item.onsetDateTime
          ? getCorrectedISODate(item.onsetDateTime)
          : "";
        item.recordedDate = item.recordedDate
          ? getCorrectedISODate(item.recordedDate)
          : "";
        item.status = item.verificationStatus
          ? item.verificationStatus.text
            ? item.verificationStatus.text
            : item.verificationStatus.coding &&
              Array.isArray(item.verificationStatus.coding) &&
              item.verificationStatus.coding.length
            ? item.verificationStatus.coding[0].display
              ? item.verificationStatus.coding[0].display
              : item.verificationStatus.coding[0].code
            : "--"
          : "--";
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
    {
      title: "Status",
      field: "status"
    }
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

MedicalHistory.propTypes = {
  data: PropTypes.array,
};
