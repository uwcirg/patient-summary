import report_config from "@config/report_config";
import React from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
// import { hasData } from "@util";
// import SimpleTable from "../SimpleTable";
// import Chart from "../Chart";
import { isEmptyArray } from "@util";
import Chart from "../Chart";
import Section from "../Section";
import SimpleTable from "../SimpleTable";
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
        flexWrap={"nowrap"}
        key={`wrapper_${table.id}`}
        sx={{
          padding: (theme) => theme.spacing(1),
        }}
      >
        <ScoringSummary
          key={`reportable_table_${table.id}`}
          scoringSummaryData={table.rows}
          disableLinks={true}
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
  // const renderTwoColumns = (section) => (
  //   <Stack
  //     direction="row"
  //     spacing={1}
  //     alignItems="flex-start"
  //     className="response-summary"
  //     flexWrap={"nowrap"}
  //     key={section.id}
  //     sx={{
  //       padding: (theme) => theme.spacing(1),
  //     }}
  //   >
  //     <div>
  //       {/* <Typography variant="h6" component="h3" color="accent" sx={{ marginBottom: 1 }} className="questionnaire-title">
  //         {section.title}
  //       </Typography> */}
  //       {section.tables.map((table) => {
  //         return (
  //           <ScoringSummary
  //             key={`reportable_table_${table.id}`}
  //             scoringSummaryData={table.rows}
  //             disableLinks={true}
  //           ></ScoringSummary>
  //         );
  //       })}
  //     </div>
  //     <div>
  //       {section.tables.map((table) => {
  //         //if (!table.chartData) return null;

  //         const allCharts = table.rows.map((row) => row.chartData);
  //         if (isEmptyArray(allCharts)) return null;
  //         return allCharts.map((chartData) => {
  //           if (isEmptyArray(chartData?.data)) return null;
  //           return <Chart key={`chart_${table.id}_${chartData?.id}`} type={chartData?.type} data={chartData}></Chart>;
  //         });
  //       })}
  //     </div>
  //   </Stack>
  // );
  const renderTable = (table) => {
    return (
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
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
              borderBottomWidth: "1px",
              borderBottomColor: "#ececec",
            }}
          >
            {table.title}
          </Typography>
        )}
        {table.layout === "simple" && <SimpleTable key={table.id} {...table}></SimpleTable>}
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
