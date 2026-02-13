import React from "react";
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

export default function Dashboard() {
  const { hasError, errorMessages, errorSeverity, fatalError, isReady, toBeLoadedResources, ...otherResults } =
    useFetchResources();
  const sectionsToShow = getSectionsToShow();

  const renderSections = () => {
    if (isEmptyArray(sectionsToShow)) return <Alert severity="warning">No section to show.</Alert>;
    return sectionsToShow.map((section) => {
      return (
        <MemoizedSection
          section={section}
          data={{
            ...otherResults,
          }}
          key={`section_${section.id}`}
        ></MemoizedSection>
      );
    });
  };
  const MemoizedSection = React.memo(
    // eslint-disable-next-line
    function MemoizedSection({ section, data }) {
      // eslint-disable-next-line
      return <Section section={section} data={data} key={`section_${section.id}`}></Section>;
    },
    (prevProps, nextProps) => {
      return prevProps?.section.id === nextProps.section?.id;
    },
  );
  MemoizedSection.proptypes = {
    section: PropTypes.element,
    data: PropTypes.object,
  };

  const renderError = () => {
    return (
      <Section
        section={{
          id: "applicationError",
          title: "Application Errors",
          body: (
            <ErrorComponent
              message={errorMessages}
              severity={errorSeverity}
              sx={{ padding: (theme) => theme.spacing(0, 2) }}
              icon={false}
            ></ErrorComponent>
          ),
          sx: {
            "& .MuiAccordionSummary-root": {
              backgroundColor: "error.main",
            },
          },
          icon: () => <ErrorIcon></ErrorIcon>,
        }}
      ></Section>
    );
  };

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
            <Version></Version>
          </Stack>
        </>
      )}
    </Box>
  );
}
