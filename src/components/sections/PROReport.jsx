import report_config from "@config/report_config";
import React from "react";
import PropTypes from "prop-types";
import { Stack, Typography } from "@mui/material";
// import { hasData } from "@util";
// import SimpleTable from "../SimpleTable";
// import Chart from "../Chart";
import { isEmptyArray } from "../../util";
import Chart from "../Chart";
import ScoringSummary from "./ScoringSummary";

export default function PROReport() {
  //const keys = Object.keys(summaries ?? {});
  return report_config.sections.map((section) => {
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        className="response-summary"
        flexWrap={"nowrap"}
        key={section.id}
        sx={{
          padding: (theme) => theme.spacing(1)
        }}
      >
        <div>
          <Typography
            variant="h6"
            component="h3"
            color="accent"
            sx={{ marginBottom: 1 }}
            className="questionnaire-title"
          >
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
            console.log("allcharts ", allCharts);
            return allCharts.map((chartData) => {
              if (isEmptyArray(chartData?.data)) return null;
              return (
                <Chart key={`chart_${table.id}_${chartData?.id}`} type={chartData?.type} data={chartData}></Chart>
              );
            });
          })}
        </div>
      </Stack>
    );
  });
}

PROReport.propTypes = {
  summaries: PropTypes.object,
};
