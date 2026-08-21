import React, { useContext, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ErrorIcon from "@mui/icons-material/ErrorOutlined";
import { getAppHeight, getSectionsToShow, isEmptyArray, saveHTMLToFHIR } from "@util";
import ErrorComponent from "./ErrorComponent";
import ProgressIndicator from "./ProgressIndicator";
import Section from "./Section";
import FloatingNavButton from "./FloatingNavButton";
import useFetchResources, {
  normalizeType,
  SUMMARY_DATA_KEY,
  QUESTIONNAIRE_DATA_KEY,
  QUESTIONNAIRE_RESPONSES_DATA_KEY,
} from "@/hooks/useFetchResources";
import { FhirClientContext } from "@/context/FhirClientContext";

const APP_HEIGHT = getAppHeight();

const MAIN_STACK_STYLE = {
  position: "relative",
  maxWidth: "1200px",
  minHeight: APP_HEIGHT,
  margin: "0 auto 52px auto",
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

// Sections whose resources array includes either of these are also gated on
// SUMMARY_DATA_KEY completing — their props (allChartData, reportData, etc.)
// are derived from summaryData, which resolves after these resources do.
const SUMMARY_DEPENDENT_IDS = new Set([QUESTIONNAIRE_DATA_KEY, QUESTIONNAIRE_RESPONSES_DATA_KEY].map(normalizeType));

function buildSectionReadyMap(sectionsToShow, toBeLoadedResources) {
  const byId = new Map(toBeLoadedResources.map((r) => [normalizeType(r.id), r]));
  const map = new Map();
  for (const section of sectionsToShow) {
    const resourceIds = section.resources ?? [];
    const needsSummary = resourceIds.some((r) => SUMMARY_DEPENDENT_IDS.has(normalizeType(r)));
    const ids = needsSummary ? [...resourceIds, SUMMARY_DATA_KEY] : resourceIds;
    const ready = isEmptyArray(ids) ? true : ids.every((id) => byId.get(normalizeType(id))?.complete);
    map.set(section.id, ready);
  }
  return map;
}

// ---------------------------------------------------------------------------
// MemoizedSection
// ---------------------------------------------------------------------------
const MemoizedSection = React.memo(function MemoizedSection({ section, data, ready }) {
  return <Section section={section} data={data} ready={ready} />;
});

MemoizedSection.propTypes = {
  section: PropTypes.object,
  data: PropTypes.object,
  ready: PropTypes.bool,
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

  // Per-section readiness, derived from which resource types have completed.
  // Recomputes only when the loader list or section config actually changes.
  const sectionReadyMap = useMemo(
    () => buildSectionReadyMap(sectionsToShow, toBeLoadedResources),
    [sectionsToShow, toBeLoadedResources],
  );

  // Memoize rendered sections — avoids re-running map when data hasn't changed
  const sectionElements = useMemo(() => {
    if (isEmptyArray(sectionsToShow)) {
      return <Alert severity="warning">No section to show.</Alert>;
    }
    return sectionsToShow.map((section) => (
      <MemoizedSection
        section={section}
        data={data}
        ready={sectionReadyMap.get(section.id)}
        key={`section_${section.id}`}
      />
    ));
  }, [sectionsToShow, data, sectionReadyMap]);

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
      <FloatingNavButton />
      <Stack className="summaries" sx={MAIN_STACK_STYLE}>
        {!isReady && (
          <ProgressIndicator
            resources={toBeLoadedResources}
            sx={(theme) => ({
              position: "relative",
              padding: theme.spacing(0, 2),
            })}
          />
        )}
        {isReady && (
          <section ref={sectionsRef} style={SECTION_STYLE}>
            {errorSectionElement}
            {!fatalError && sectionElements}
          </section>
        )}
      </Stack>
    </Box>
  );
}
