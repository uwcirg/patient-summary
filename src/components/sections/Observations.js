import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import MaterialTable from "@material-table/core";
import TableContainer from "@mui/material/TableContainer";
import Observation from "../../models/Observation";

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
    const goodData = Observation.getGoodData(data);
    return goodData
      .map((item, index) => {
        const o = new Observation(item);
        item.id = item.id + "_" + index;
        item.category = o.category || "--";
        item.text = o.displayText || "--";
        item.date = o.dateText;
        item.provider = o.providerText || "--";
        item.value = o.valueText || "--";
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
