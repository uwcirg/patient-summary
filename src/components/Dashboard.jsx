import React, { useContext, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ErrorIcon from "@mui/icons-material/ErrorOutlined";
import { getAppHeight, getSectionsToShow, isEmptyArray, saveHTMLToFHIR } from "@util";
import ErrorComponent from "./ErrorComponent";
import Loader from "./Loader";
import ProgressIndicator from "./ProgressIndicator";
import Section from "./Section";
import FloatingNavButton from "./FloatingNavButton";
import useFetchResources from "@/hooks/useFetchResources";
import { FhirClientContext } from "@/context/FhirClientContext";

// ---------------------------------------------------------------------------
// Constants — hoisted to avoid recreation on every render
// ---------------------------------------------------------------------------
const APP_HEIGHT = getAppHeight();

const MAIN_STACK_STYLE = {
  position: "relative",
  maxWidth: "1200px",
  minHeight: APP_HEIGHT,
  margin: "auto",
};

const SECTION_STYLE = { minHeight: APP_HEIGHT };

const ERROR_SECTION_BASE = {
  id: "applicationError",
  title: "Application Errors",
  sx: {
    "& .MuiAccordionSummary-root": {
      backgroundColor: "error.main",
    },
  },
  icon: () => <ErrorIcon />,
};

// ---------------------------------------------------------------------------
// MemoizedSection
// ---------------------------------------------------------------------------
const MemoizedSection = React.memo(function MemoizedSection({ section, data }) {
  return <Section section={section} data={data} />;
});

MemoizedSection.propTypes = {
  section: PropTypes.object,
  data: PropTypes.object,
};

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const {
    // status
    isReady,
    hasError,
    errorMessages,
    errorSeverity,
    fatalError,
    toBeLoadedResources,

    // named values sections consume explicitly
    allScoringSummaryData,
    allChartData,
    chartKeys,
    reportData,
    questionnaires,
    questionnaireResponses,
    summaries,

    // dynamic evalResults keys (Condition, Observation, etc.)
    evalData,
  } = useFetchResources();

  const { client, patient } = useContext(FhirClientContext);

  const hasSavedSnapshot = useRef(false);
  const sectionsRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Stable flat object passed into every Section — only recomputes when a
  // constituent value changes, not on every render.
  // evalData is memoized in the hook so it won't cause unnecessary recomputes.
  const data = useMemo(
    () => ({
      allScoringSummaryData,
      allChartData,
      chartKeys,
      reportData,
      questionnaires,
      questionnaireResponses,
      summaries,
      // spread dynamic keys last so named keys above take precedence
      ...evalData,
    }),
    [
      allScoringSummaryData,
      allChartData,
      chartKeys,
      reportData,
      questionnaires,
      questionnaireResponses,
      summaries,
      evalData,
    ],
  );

  // Section config is static at runtime — compute once
  const sectionsToShow = useMemo(() => getSectionsToShow(), []);

  // Memoize rendered sections — avoids re-running map when data hasn't changed
  const sectionElements = useMemo(() => {
    if (isEmptyArray(sectionsToShow)) {
      return <Alert severity="warning">No section to show.</Alert>;
    }
    return sectionsToShow.map((section) => (
      <MemoizedSection section={section} data={data} key={`section_${section.id}`} />
    ));
  }, [sectionsToShow, data]);

  // Memoize error section config — body only changes when messages/severity change
  const errorSection = useMemo(
    () => ({
      ...ERROR_SECTION_BASE,
      body: (
        <ErrorComponent
          message={errorMessages}
          severity={errorSeverity}
          sx={(theme) => ({ padding: theme.spacing(0, 2) })}
          icon={false}
        />
      ),
    }),
    [errorMessages, errorSeverity],
  );

  // Memoize rendered error element — avoids re-creating JSX on unrelated renders
  const errorSectionElement = useMemo(
    () => (hasError ? <Section section={errorSection} /> : null),
    [hasError, errorSection],
  );

  useEffect(() => {
    if (!isReady || hasSavedSnapshot.current || !sectionsRef.current) return;

    // MutationObserver watches for actual DOM changes in the sections container,
    // so we only snapshot after child content (charts, tables) is truly in the DOM
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        requestAnimationFrame(() => {
          if (hasSavedSnapshot.current) return;
          hasSavedSnapshot.current = true;
          observer.disconnect();
          saveHTMLToFHIR(client, patient?.id).catch(console.error);
        });
      }, 500); // wait 500ms of DOM quiet before snapshotting
    });

    observer.observe(sectionsRef.current, {
      childList: true, // watches for sections being added
      subtree: true, // watches all descendants (charts, table rows, etc.)
      attributes: false,
    });

    return () => observer.disconnect();
  }, [isReady, client, patient]);

  return (
    <Box className="app">
      {!isReady && (
        <Loader>
          <ProgressIndicator
            resources={toBeLoadedResources}
            sx={(theme) => ({
              position: "relative",
              padding: theme.spacing(0, 2),
            })}
          />
        </Loader>
      )}
      {isReady && (
        <>
          <FloatingNavButton />
          <Stack className="summaries" sx={MAIN_STACK_STYLE}>
            <section ref={sectionsRef} style={SECTION_STYLE}>
              {errorSectionElement}
              {!fatalError && sectionElements}
            </section>
          </Stack>
        </>
      )}
    </Box>
  );
}
