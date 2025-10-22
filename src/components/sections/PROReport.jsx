import report_config from "@config/report_config";
import React from "react";
import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
// import { hasData } from "@util";
// import SimpleTable from "../SimpleTable";
// import Chart from "../Chart";
import { isEmptyArray } from "@util";
import Chart from "../Chart";
import SimpleTable from "../SimpleTable";
import ScoringSummary from "./ScoringSummary";

export default function PROReport() {
  //const keys = Object.keys(summaries ?? {});
  const renderTwoColumns = (section) => (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      className="response-summary"
      flexWrap={"nowrap"}
      key={section.id}
      sx={{
        padding: (theme) => theme.spacing(1),
      }}
    >
      <div>
        <Typography variant="h6" component="h3" color="accent" sx={{ marginBottom: 1 }} className="questionnaire-title">
          {section.title}
        </Typography>
        {section.tables.map((table) => {
          return (
            <ScoringSummary
              key={`reportable_table_${table.id}`}
              scoringSummaryData={table.rows}
              disableLinks={true}
            ></ScoringSummary>
          );
        })}
      </div>
      <div>
        {section.tables.map((table) => {
          //if (!table.chartData) return null;

          const allCharts = table.rows.map((row) => row.chartData);
          if (isEmptyArray(allCharts)) return null;
          return allCharts.map((chartData) => {
            if (isEmptyArray(chartData?.data)) return null;
            return <Chart key={`chart_${table.id}_${chartData?.id}`} type={chartData?.type} data={chartData}></Chart>;
          });
        })}
      </div>
    </Stack>
  );
  return report_config.sections.map((section) => {
    if (section.layout == "simple")
      return section.tables.map((table) => (
        <Box key={table.id} sx={{marginLeft: 1, marginBottom: 1}}>
          <Typography
            variant="h6"
            component="h3"
            color="accent"
            sx={{ marginBottom: 1}}
            className="questionnaire-title"
          >
            {section.title}
          </Typography>
          <SimpleTable key={section.id} {...table}></SimpleTable>
        </Box>
      ));
    return renderTwoColumns(section);
  });
}

PROReport.propTypes = {
  summaries: PropTypes.object,
};
