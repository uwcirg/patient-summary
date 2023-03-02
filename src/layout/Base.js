import PropTypes from "prop-types";
import { useLayoutEffect} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "react-query";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Content from "./Content";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import {
  injectFaviconByProject,
  fetchEnvData,
} from "../util/util";
import { getTheme } from "../config/theme_config";
import "../style/App.scss";
import FhirClientProvider from "../context/FhirClientProvider";

function ErrorFallBack({ error }) {
  return (
    <Alert severity="error">
      <AlertTitle>Something went wrong:</AlertTitle>
      <pre>{error.message}</pre>
      <p>Refresh page and try again</p>
    </Alert>
  );
}
const queryClient = new QueryClient();

export default function Base({ children }) {
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
            <Content>{children}</Content>
          </FhirClientProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
Base.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
