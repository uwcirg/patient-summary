import { ErrorBoundary } from "react-error-boundary";
import {useEffect} from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import FhirClientProvider from "../FhirClientProvider";
import Header from "./Header";
import Summary from "./Summary";
import {injectFaviconByProject} from "../util/util";
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

export default function App() {
  useEffect(() => {
    injectFaviconByProject();
  }, []);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallBack}>
      <ThemeProvider theme={getTheme()}>
        <FhirClientProvider>
          <CssBaseline />
          <Header />
          <Summary />
          {/* add other components as needed */}
        </FhirClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
