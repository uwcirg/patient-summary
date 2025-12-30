import { report_config } from "@config/report_config";
import React, { useMemo, useCallback } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { isEmptyArray } from "@util";
import Chart from "../Chart";
import Section from "../Section";
import ScoringSummary from "./ScoringSummary";

// Move styles outside component
const sectionWrapperSx = {
  alignSelf: "stretch",
  padding: (theme) => theme.spacing(0, 1),
};

const titleSx = {
  //marginBottom: 1,
  fontWeight: 500,
  // borderBottomStyle: "solid",
  // borderBottomWidth: "1px",
  backgroundColor: "#eeeff3",
  padding: (theme) => theme.spacing(0.5, 1),
};

const sectionSx = {
  padding: (theme) => theme.spacing(1),
};

const tableStyle = { width: "auto", minWidth: "50%" };

const flexWrapConfig = {
  xs: "wrap",
  sm: "wrap",
  md: "nowrap",
  lg: "nowrap",
};

export default function PROReport() {
  const renderTwoColumns = useCallback((table) => {
    return (
      <Stack
        direction="row"
        alignItems="center"
        className="response-summary"
        flexWrap={flexWrapConfig}
        key={`wrapper_${table.id}`}
      >
        <ScoringSummary
          key={`reportable_table_${table.id}`}
          data={table.rows}
          disableLinks={true}
          enableResponsesViewer={true}
        />
        <Box>
          {!isEmptyArray(table.charts) &&
            table.charts.map((chartData, index) => {
              if (isEmptyArray(chartData?.data)) return null;
              return (
                <Chart key={`chart_${table.id}_${chartData?.id}_${index}`} type={chartData?.type} data={chartData} />
              );
            })}
        </Box>
      </Stack>
    );
  }, []);

  const renderTable = useCallback(
    (table) => {
      return (
        <Box className="section-wrapper" sx={sectionWrapperSx} key={table.id}>
          {table.title && (
            <Typography
              variant="body1"
              component="h3"
              color="accent"
              sx={{ ...titleSx, marginBottom: table.title ? 1 : 0 }}
            >
              {table.title}
            </Typography>
          )}
          {table.layout === "simple" && (
            <ScoringSummary
              key={table.id}
              data={table.rows}
              disableLinks={true}
              enableResponsesViewer={true}
              tableStyle={tableStyle}
              {...table}
            />
          )}
          {table.layout === "two-columns" && renderTwoColumns(table)}
        </Box>
      );
    },
    [renderTwoColumns],
  );

  const sections = useMemo(() => {
    return report_config.sections.map((section, index) => (
      <Section
        key={`${section.id}_${index}`}
        section={{
          id: section.id,
          title: section.title,
          body: section.tables.map((table) => renderTable(table)),
        }}
        sx={sectionSx}
      />
    ));
  }, [renderTable]);

  return sections;
}
