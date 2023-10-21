import * as React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import MaterialTable from "@material-table/core";
import TableContainer from "@mui/material/TableContainer";
import { getCorrectedISODate } from "../../util/util";

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
  const getItemValue = (item) => {
    if (!item) return "--";
    if (item.valueQuantity && item.valueQuantity.value) {
      return item.valueQuantity.value;
    }
    if (item.valueString && item.valueString.value) {
      return item.valueString.value;
    }
    if (item.valueBoolean && item.valueBoolean.value) {
      return String(item.valueBoolean.value);
    }
    if (item.valueInteger && item.valueInteger.value) {
      return item.valueInteger.value;
    }
    if (item.valueCodeableConcept && item.valueCodeableConcept.text) {
      return item.valueCodeableConcept.text;
    }
    // need to handle date/time value

    return "--";
  };
  const getComponentDisplays = (item) => {
    if (!item || !item.component || !item.component.length) return "--";
    return item.component.map(o => {
      const textDisplay = o.code && o.code.text ? o.code.text: "";
      const valueDisplay = getItemValue(o);
      return [textDisplay, valueDisplay].join("/");
    }).join(", ");
  }
  const getData = (data) => {
    if (!data) return null;
    const goodData = data.filter(
      (item) =>
        item.resourceType === "Observation" &&
        item.code &&
        item.code.coding &&
        item.code.coding.length > 0
    );
    return goodData
      .map((item, index) => {
        item.id = item.id + "_" + index;
        const joinedDisplays = item.code.coding.filter(o => o.display).map(o => o.display).join(", ");
        item.text = joinedDisplays || "--";
        item.date = getCorrectedISODate(item.issued);
        item.provider =
          item.performer && item.performer.length
            ? item.performer[0].display
            : "--";
        item.value = item.component ? getComponentDisplays(item) : getItemValue(item);
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
      title: "Date",
      field: "date",
    },
    {
      title: "Provider",
      field: "provider",
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
