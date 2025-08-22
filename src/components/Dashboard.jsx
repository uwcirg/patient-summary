import React from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { getAppHeight, getSectionsToShow, isEmptyArray } from "@util";
import ErrorComponent from "./ErrorComponent";
import Loader from "./Loader";
import ProgressIndicator from "./ProgressIndicator";
import Section from "./Section";
import Version from "./Version";
import FloatingNavButton from "./FloatingNavButton";
import useFetchResources from "@/hooks/useFetchResources";

export default function Dashboard() {
  const {
    error,
    loading,
    isReady,
    patientBundle,
    questionnaireList,
    summaryData,
    evalData,
    toBeLoadedResources,
    allChartData,
  } = useFetchResources();
  const sectionsToShow = getSectionsToShow();

  const renderSections = () => {
    if (isEmptyArray(sectionsToShow)) return <Alert severity="warning">No section to show.</Alert>;
    return sectionsToShow.map((section) => {
      return (
        <Section
          section={section}
          data={{
            patientBundle,
            summaryData,
            questionnaireList,
            evalData,
            allChartData,
          }}
          key={`section_${section.id}`}
        ></Section>
      );
    });
  };

  const renderError = () => {
    return (
      <Box sx={{ marginTop: 1 }}>
        <ErrorComponent message={error}></ErrorComponent>
      </Box>
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
      {loading && (
        <Loader>
          <ProgressIndicator resources={toBeLoadedResources} sx={{position: "relative"}}></ProgressIndicator>
        </Loader>
      )}

      {!loading && isReady && (
        <>
          <FloatingNavButton></FloatingNavButton>
          <Stack className="summaries" sx={mainStackStyleProps}>
            <section>
              {error && renderError()}
              {!error && <>{renderSections()}</>}
            </section>
            <Version></Version>
          </Stack>
        </>
      )}
    </Box>
  );
}
