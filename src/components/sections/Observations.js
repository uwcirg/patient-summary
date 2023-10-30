import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import MaterialTable from "@material-table/core";
import TableContainer from "@mui/material/TableContainer";
import {
  getCorrectedISODate,
  getFhirItemValue,
  getFhirComponentDisplays,
} from "../../util/util";

export default function Observations(props) {
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
        String(item.resourceType).toLowerCase() === "observation" &&
        item.code &&
        item.code.coding &&
        item.code.coding.length > 0
    );
    return goodData
      .map((item, index) => {
        item.id = item.id + "_" + index;
        item.category =
          item.category && Array.isArray(item.category) && item.category.length
            ? item.category
                .map((o) =>
                  o.text
                    ? o.text
                    : o.coding && o.coding.length && o.coding[0].display
                    ? o.coding[0].display
                    : "--"
                )
                .join(", ")
            : item.category
            ? item.category
            : "--";
        const joinedDisplays = item.code.coding
          .filter((o) => o.display)
          .map((o) => o.display)
          .join(", ");
        item.text = joinedDisplays || "--";
        item.date = getCorrectedISODate(item.issued);
        item.provider =
          item.performer && item.performer.length
            ? item.performer[0].display
            : "--";
        item.value = item.component
          ? getFhirComponentDisplays(item)
          : getFhirItemValue(item);
        if (
          item.value == null ||
          item.value === "" ||
          typeof item.value === "undefined"
        )
          item.value = "--";
        return item;
      })
      .sort((a, b) => {
        return new Date(b.issued).getTime() - new Date(a.issued).getTime();
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
      title: "Name",
      field: "text",
    },
    {
      title: "Value / Text",
      field: "value",
    },
    {
      title: "Issued Date",
      field: "date",
    },
    {
      title: "Category",
      field: "category",
    },
    // {
    //   title: "Provider",
    //   field: "provider",
    // },
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
        No recorded observation
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

Observations.propTypes = {
  data: PropTypes.array,
};
