import React, { useMemo, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography } from "@mui/material";
import { accordionSummaryClasses } from "@mui/material/AccordionSummary";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { report_config } from "@config/report_config";
import { isEmptyArray } from "@util";
import Loader from "@components/Loader";
import Section from "../Section";

// --- Static styles ---
const sectionWrapperSx = { alignSelf: "stretch" };
const tableStyle = { width: "auto", minWidth: "30%" };
const flexWrapConfig = { xs: "wrap", sm: "wrap", md: "nowrap", lg: "nowrap" };
const marginTopConfig = { xs: 2, sm: 2, md: 1, lg: 0 };
const containerStyleConfig = {
  alignSelf: "stretch",
  flexBasis: { xs: "100%", sm: "100%", md: "50%", lg: "50%" },
  maxWidth: "100%",
};
const accordionSummarySx = {
  minHeight: "42px",
  backgroundColor: "#f2f3f9",
  [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]: {
    transform: "rotate(-90deg)",
  },
  borderBottom: "1px solid #FFF",
};

const LazyPrintChunks = lazy(() => import("../PrintChunks"));
const LazyChart = lazy(() => import("../Chart"));
const LazyScoringSummary = lazy(() => import("./ScoringSummary"));

// --- TwoColumns component ---
const TwoColumns = React.memo(function TwoColumns({ table }) {
  return (
    <Stack
      direction="row"
      className="response-summary"
      sx={{
        alignItems: "flex-start",
        flexWrap: flexWrapConfig,
      }}
    >
      <Suspense fallback={<Loader message="Loading scoring summary..." variant="inline" styles={{ width: "100%" }} />}>
        <LazyScoringSummary
          {...table}
          data={table.rows}
          disableLinks={true}
          enableResponsesViewer={true}
          containerStyle={containerStyleConfig}
        />
      </Suspense>
      <Box
        sx={{
          maxWidth: "100%",
          marginTop: marginTopConfig,
        }}
      >
        {!isEmptyArray(table.charts) &&
          table.charts.map((chartData, index) => {
            if (isEmptyArray(chartData?.data)) return null;
            return (
              <Suspense
                fallback={
                  <Loader message="Loading chart..." variant="inline" styles={{ width: "100%", minHeight: 240 }} />
                }
                key={`chart_container_${table.id}_${chartData?.id}_${index}`}
              >
                <LazyChart
                  key={`chart_${table.id}_${chartData?.id}_${index}`}
                  type={chartData?.type}
                  data={chartData}
                />
              </Suspense>
            );
          })}
      </Box>
    </Stack>
  );
});
TwoColumns.propTypes = {
  table: PropTypes.object,
};

// --- TableItem component ---
const TableItem = React.memo(function TableItem({ table, section }) {
  const multipleTables = section.tables?.length > 1;
  return (
    <Box className="section-wrapper" sx={sectionWrapperSx} key={table.id}>
      <Accordion
        disableGutters={true}
        elevation={multipleTables ? 1 : 0}
        square
        defaultExpanded
        sx={[
          multipleTables
            ? {
                marginLeft: "8px",
              }
            : {
                marginLeft: 0,
              },
          multipleTables
            ? {
                marginRight: "8px",
              }
            : {
                marginRight: 0,
              },
        ]}
      >
        {table.title && (
          <AccordionSummary
            expandIcon={<ArrowForwardIosSharpIcon sx={{ fontSize: "0.9rem" }} />}
            aria-controls={`panel-${table.id}-content`}
            id={`panel-${table.id}-header`}
            sx={accordionSummarySx}
          >
            <Typography variant="body1" component="h3" className="section-subtitle">
              {table.title}
            </Typography>
          </AccordionSummary>
        )}
        <AccordionDetails sx={{ padding: "16px" }}>
          <Box>
            {table.layout === "simple" && (
              <LazyScoringSummary
                {...table}
                data={table.rows}
                disableLinks={true}
                enableResponsesViewer={true}
                tableStyle={tableStyle}
              />
            )}
            {table.layout === "two-columns" && <TwoColumns table={table} />}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
});
TableItem.propTypes = {
  table: PropTypes.object,
  section: PropTypes.object,
};

// --- Main component ---
export default function PROReport() {
  const sections = useMemo(
    () =>
      report_config.sections.map((section) => (
        <Section
          key={section.id}
          section={{
            id: section.id,
            title: section.title,
            body: section.tables.map((table) => <TableItem key={table.id} table={table} section={section} />),
          }}
        />
      )),
    [],
  );

  const printTables = useMemo(
    () =>
      report_config.sections.map((section) => (
        <Suspense key={section.id} fallback={<Loader message="Loading..." variant="inline" />}>
          <LazyPrintChunks section={section} />
        </Suspense>
      )),
    [],
  );

  return (
    <>
      {sections}
      <Box className="print-only history-block print-chunks-history">{printTables}</Box>
    </>
  );
}
