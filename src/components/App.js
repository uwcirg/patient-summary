import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "react-query";
import {useLayoutEffect} from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import FhirClientProvider from "../context/FhirClientProvider";
import Header from "./Header";
import Summaries from "./Summaries";
import TimeoutModal from "./TimeoutModal";
import {injectFaviconByProject, fetchEnvData} from "../util/util";
import { getTheme } from "../config/theme_config";
import "../style/App.scss";

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

export default function App() {
  fetchEnvData();
  useLayoutEffect(() => {
    injectFaviconByProject();
  }, []);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallBack}>
      <ThemeProvider theme={getTheme()}>
        <QueryClientProvider client={queryClient}>
          <FhirClientProvider>
            <CssBaseline />
            <Header />
            <Summaries />
            <TimeoutModal />
            {/* add other components as needed */}
          </FhirClientProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
