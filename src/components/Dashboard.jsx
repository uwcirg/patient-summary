import React, { useCallback, useContext, useEffect, useRef, useMemo } from "react";
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

const MemoizedSection = React.memo(function MemoizedSection({ section, data }) {
  return <Section section={section} data={data}></Section>;
});

MemoizedSection.propTypes = {
  section: PropTypes.object,
  data: PropTypes.object,
};

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

let debounceTimer = null;

export default function Dashboard() {
  const { hasError, errorMessages, errorSeverity, fatalError, isReady, toBeLoadedResources, ...otherResults } =
    useFetchResources();
  const data = useMemo(() => ({ ...otherResults }), [otherResults]);
  const sectionsToShow = getSectionsToShow();
  const { client, patient } = useContext(FhirClientContext);
  const hasSavedSnapshot = useRef(false);
  const sectionsRef = useRef(null);

  const renderSections = useCallback(() => {
    if (isEmptyArray(sectionsToShow)) return <Alert severity="warning">No section to show.</Alert>;
    return sectionsToShow.map((section) => (
      <MemoizedSection section={section} data={data} key={`section_${section.id}`} />
    ));
  }, [sectionsToShow, data]);

  const errorSection = useMemo(
    () => ({
      ...ERROR_SECTION_BASE,
      body: (
        <ErrorComponent
          message={errorMessages}
          severity={errorSeverity}
          sx={{ padding: (theme) => theme.spacing(0, 2) }}
          icon={false}
        />
      ),
    }),
    [errorMessages, errorSeverity],
  );

  const renderError = useCallback(() => {
    return <Section section={errorSection} />;
  }, [errorSection]);

  const mainStackStyleProps = {
    position: "relative",
    maxWidth: "1200px",
    minHeight: getAppHeight(),
    margin: "auto",
  };

  useEffect(() => {
    if (!isReady || hasSavedSnapshot.current || !sectionsRef.current) return;

    // MutationObserver watches for actual DOM changes in the sections container,
    // so we only snapshot after child content (charts, tables) is truly in the DOM
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
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
            sx={{ position: "relative", padding: (theme) => theme.spacing(0, 2) }}
          ></ProgressIndicator>
        </Loader>
      )}

      {isReady && (
        <>
          <FloatingNavButton></FloatingNavButton>
          <Stack className="summaries" sx={mainStackStyleProps}>
            <section ref={sectionsRef} style={{ minHeight: getAppHeight() }}>
              {hasError && renderError()}
              {!fatalError && renderSections()}
            </section>
          </Stack>
        </>
      )}
    </Box>
  );
}
