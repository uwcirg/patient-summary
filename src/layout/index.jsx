import PropTypes from "prop-types";
import React, { useLayoutEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "react-query";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import { injectFaviconByProject, fetchEnvData } from "../util/util";
import { getTheme } from "../config/theme_config";
import "../style/App.scss";
import FhirClientProvider from "../context/FhirClientProvider";
import QuestionnaireListProvider from "../context/QuestionnaireListProvider";
import Base from "./Base";

function ErrorFallBack({ error }) {
  if (!error.message) return null;
  return (
    <Alert severity="error">
      <AlertTitle>Something went wrong:</AlertTitle>
      <pre>{error.message}</pre>
      <p>Refresh page and try again</p>
    </Alert>
  );
}
const queryClient = new QueryClient();

export default function Index({ children }) {
  fetchEnvData();
  const theme = getTheme();
  useLayoutEffect(() => {
    injectFaviconByProject();
  }, []);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallBack}>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <FhirClientProvider>
            <CssBaseline />
            <QuestionnaireListProvider>
              <Base>{children}</Base>
            </QuestionnaireListProvider>
          </FhirClientProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

Index.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

ErrorFallBack.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};
