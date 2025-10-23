import {report_config} from "@config/report_config";
import React from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
// import { hasData } from "@util";
// import SimpleTable from "../SimpleTable";
// import Chart from "../Chart";
import { isEmptyArray } from "@util";
import Chart from "../Chart";
import Section from "../Section";
//import SimpleTable from "../SimpleTable";
import ScoringSummary from "./ScoringSummary";

export default function PROReport() {
  //const keys = Object.keys(summaries ?? {});
  const renderTwoColumns = (table) => {
    const allCharts = table.rows.map((row) => row.chartData);
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        className="response-summary"
        flexWrap={{
          xs: "wrap",
          sm: "wrap",
          md: "nowrap",
        }}
        key={`wrapper_${table.id}`}
      >
        <ScoringSummary
          key={`reportable_table_${table.id}`}
          scoringSummaryData={table.rows}
          disableLinks={true}
          containerStyle={{
            alignSelf: "stretch"
          }}
        ></ScoringSummary>
        <Box>
          {!isEmptyArray(allCharts) &&
            allCharts.map((chartData) => {
              if (isEmptyArray(chartData?.data)) return null;
              return <Chart key={`chart_${table.id}_${chartData?.id}`} type={chartData?.type} data={chartData}></Chart>;
            })}
        </Box>
      </Stack>
    );
  };
  const renderTable = (table) => {
    return (
      <Box sx={{ marginBottom: (theme) => theme.spacing(2), alignSelf: "stretch" , padding: (theme) => theme.spacing(0, 1)}}>
        {table.title && (
          <Typography
            variant="body1"
            component="h4"
            color="accent"
            sx={{
              marginBottom: 1,
              marginLeft: 1,
              fontWeight: 500,
              borderBottomStyle: "solid",
              borderBottomWidth: "2px",
              borderBottomColor: "#ececec",
            }}
          >
            {table.title}
          </Typography>
        )}
        {table.layout === "simple" && (
          <ScoringSummary
            key={table.id}
            scoringSummaryData={table.rows}
            disableLinks={true}
            tableStyle={{
              width: "auto",
            }}
            {...table}
          ></ScoringSummary>
        )}
        {table.layout === "two-columns" && renderTwoColumns(table)}
      </Box>
    );
  };
  return report_config.sections.map((section) => {
    //if (section.layout == "simple")
    return (
      <Section
        key={section.id}
        section={{
          id: section.id,
          title: section.title,
          body: (
            <>
              {section.tables.map((table) => {
                return renderTable(table);
              })}
            </>
          ),
        }}
        sx={{
          padding: (theme) => theme.spacing(1),
        }}
      ></Section>
    );
  });
}

PROReport.propTypes = {
  summaries: PropTypes.object,
};
