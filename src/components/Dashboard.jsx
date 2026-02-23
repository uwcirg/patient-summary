import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import ErrorIcon from "@mui/icons-material/ErrorOutlined";
import { getAppHeight, getSectionsToShow, isEmptyArray } from "@util";
import ErrorComponent from "./ErrorComponent";
import Loader from "./Loader";
import ProgressIndicator from "./ProgressIndicator";
import Section from "./Section";
import Version from "./Version";
import FloatingNavButton from "./FloatingNavButton";
import useFetchResources from "@/hooks/useFetchResources";

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

export default function Dashboard() {
  const { hasError, errorMessages, errorSeverity, fatalError, isReady, toBeLoadedResources, ...otherResults } =
    useFetchResources();
  const data = useMemo(() => ({ ...otherResults }), [otherResults]);
  const sectionsToShow = getSectionsToShow();

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
            <section style={{ minHeight: getAppHeight() }}>
              {hasError && renderError()}
              {!fatalError && renderSections()}
            </section>
            <Version />
          </Stack>
        </>
      )}
    </Box>
  );
}
