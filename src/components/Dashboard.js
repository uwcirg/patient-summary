import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import {
  getAppHeight,
  getSectionsToShow,
  isEmptyArray,
} from "../util/util";
import ErrorComponent from "./ErrorComponent";
import ProgressIndicator from "./ProgressIndicator";
import Section from "./Section";
import Version from "./Version";
import FloatingNavButton from "./FloatingNavButton";
import useFetchResources from "../hooks/useFetchResources";

export default function Dashboard() {
  const {
    error,
    isReady,
    patientBundle,
    questionnareKeys,
    questionnaireList,
    summaryData,
    toBeLoadedResources,
  } = useFetchResources();
  const sectionsToShow = getSectionsToShow();
  
  const renderSections = () => {
    if (isEmptyArray(sectionsToShow))
      return <Alert severity="warning">No section to show.</Alert>;
    return sectionsToShow.map((section) => {
      return (
        <Section
          section={section}
          data={{
            patientBundle: patientBundle,
            summaryData: summaryData,
            questionnaireKeys: questionnareKeys,
            questionnaireList: questionnaireList
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
    maxWidth: "1160px",
    minHeight: getAppHeight(),
    margin: "auto",
  };

  return (
    <Box className="app">
      {!isReady && (
        <ProgressIndicator resources={toBeLoadedResources}></ProgressIndicator>
      )}
      {isReady && (
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
