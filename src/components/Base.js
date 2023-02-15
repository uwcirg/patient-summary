import PropTypes from "prop-types";
import { useLayoutEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "react-query";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import BottomNav from "./BottomNav";
import Header from "./Header";
import SideNav from "./SideNav";
import {
  injectFaviconByProject,
  fetchEnvData,
  getEnv,
  getSectionsToShow,
  shouldShowHeader,
  shouldShowNav,
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
  const sections = getSectionsToShow();
  useLayoutEffect(() => {
    injectFaviconByProject();
  }, []);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallBack}>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <FhirClientProvider>
            <Box
              sx={{ display: "flex" }}
              className={!shouldShowHeader() ? "no-header" : ""}
            >
              <CssBaseline />
              {shouldShowHeader() && (
                <Header returnURL={getEnv("REACT_APP_DASHBOARD_URL")} />
              )}
              {shouldShowNav() && <SideNav sections={sections}></SideNav>}
              <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar />
                {children}
                {/* add other components as needed */}
              </Box>
              {shouldShowNav() && <BottomNav></BottomNav>}
            </Box>
          </FhirClientProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

Base.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
