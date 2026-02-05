import { report_config } from "@config/report_config";
import React, { useMemo, useCallback } from "react";
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography } from "@mui/material";
import { accordionSummaryClasses } from "@mui/material/AccordionSummary";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { isEmptyArray } from "@util";
import Chart from "../Chart";
import ResponsesTable from "../ResponsesTable";
import Section from "../Section";
import ScoringSummary from "./ScoringSummary";

// Move styles outside component
const sectionWrapperSx = {
  alignSelf: "stretch",
};

const tableStyle = { width: "auto", minWidth: "30%" };

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
        alignItems="flex-start"
        className="response-summary"
        flexWrap={flexWrapConfig}
        key={`wrapper_${table.id}`}
      >
        <ScoringSummary
          {...table}
          key={`reportable_table_${table.id}`}
          data={table.rows}
          disableLinks={true}
          enableResponsesViewer={true}
          containerStyle={{
            alignSelf: "stretch",
            flexBasis: {
              xs: "100%",
              sm: "100%",
              md: "50%",
              lg: "50%",
            },
          }}
        />
        <Box
          sx={{
            marginTop: {
              xs: 2,
              sm: 2,
              md: 1,
              lg: 0,
            },
          }}
        >
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
    (table, section) => {
      const multipleTables = section.tables?.length > 1;
      return (
        <Box className="section-wrapper" sx={sectionWrapperSx} key={table.id}>
          <Accordion
            disableGutters
            elevation={multipleTables ? 1 : 0}
            square
            defaultExpanded
            sx={{ marginLeft: multipleTables ? "8px" : 0, marginRight: multipleTables ? "8px" : 0 }}
          >
            {table.title && (
              <AccordionSummary
                expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
                aria-controls={`panel-${table.id}-content`}
                id={`panel-${table.id}-header`}
                sx={{
                  minHeight: "42px",
                  backgroundColor: "#e8eaf6",
                  [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]: {
                    transform: "rotate(90deg)",
                  },
                }}
              >
                <Typography variant="body1" component="h3" className="section-subtitle">
                  {table.title}
                </Typography>
              </AccordionSummary>
            )}
            <AccordionDetails>
              <Box>
                {table.layout === "simple" && (
                  <ScoringSummary
                    {...table}
                    key={table.id}
                    data={table.rows}
                    disableLinks={true}
                    enableResponsesViewer={true}
                    tableStyle={tableStyle}
                  />
                )}
                {table.layout === "two-columns" && renderTwoColumns(table)}
              </Box>
            </AccordionDetails>
          </Accordion>
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
          body: section.tables.map((table) => renderTable(table, section)),
        }}
        // sx={sectionSx}
      />
    ));
  }, [renderTable]);

  const printTables = useMemo(() => {
    return report_config.sections.map((section, index) => {
      return (
        <Box className="print-only" key={`${section.id}_printonly_${index}`}>
          {section.tables.map((table) => {
            return table.rows?.map((row) => {
              if (!row.printColumnChunks) return null;
              return row.printColumnChunks.map((chunk, index) => {
                return (
                  <ResponsesTable
                    key={`${row.id}_chunk_${index}`}
                    columns={chunk.columns}
                    tableData={row.tableResponseData}
                    title={`${row.title} History ${index > 0 ? "(cont'd)" : ""}`}
                  ></ResponsesTable>
                );
              });
            });
          })}
        </Box>
      );
    });
  }, []);

  return (
    <>
      {sections}
      <Box className="print-only history-block">{printTables}</Box>
    </>
  );
}
