import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { useState, useLayoutEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { QueryClient, QueryClientProvider } from "react-query";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Divider from "@mui/material/Divider";
import BottomNav from "./BottomNav";
import Header from "./Header";
import SectionList from "./SectionList";
import {
  injectFaviconByProject,
  fetchEnvData,
  getEnv,
  getSectionsToShow,
} from "../util/util";
import { getTheme } from "../config/theme_config";
import "../style/App.scss";
import FhirClientProvider from "../context/FhirClientProvider";

const drawerWidth = 240;

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

const openedMixin = (theme) => ({
  width: drawerWidth,
  [theme.breakpoints.up("sm")]: {
    width: drawerWidth,
  },
  [theme.breakpoints.up("md")]: {
    width: drawerWidth,
  },
  [theme.breakpoints.up("lg")]: {
    width: drawerWidth + 68,
  },
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1.5),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: { drawerWidth },
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme),
  }),
}));

export default function Base({ children }) {
  const theme = getTheme();
  const sections = getSectionsToShow();
  const [open, setOpen] = useState(true);
  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };
  const renderDrawerHeaderButton = () => (
    <DrawerHeader>
      <IconButton
        onClick={open ? handleDrawerClose : handleDrawerOpen}
        title="collapse/expand"
      >
        {open && <ChevronLeftIcon color="primary" />}
        {!open && <ChevronRightIcon color="primary" />}
      </IconButton>
    </DrawerHeader>
  );
  const renderDrawer = (sections) => {
    if (!sections) return null;
    return (
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          display: { xs: "none", sm: "none", md: "block" },
        }}
      >
        <Toolbar />
        {renderDrawerHeaderButton()}
        <Divider />
        <Box>
          <SectionList list={sections} expanded={open}></SectionList>
        </Box>
      </Drawer>
    );
  };
  fetchEnvData();
  useLayoutEffect(() => {
    injectFaviconByProject();
  }, []);
  return (
    <ErrorBoundary FallbackComponent={ErrorFallBack}>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <FhirClientProvider>
            <Box sx={{ display: "flex" }}>
              <CssBaseline />
              <Header returnURL={getEnv("REACT_APP_DASHBOARD_URL")} />
              {renderDrawer(sections)}
              <Box component="main" sx={{ flexGrow: 1 }}>
                <Toolbar />
                {children}
                {/* add other components as needed */}
              </Box>
              <BottomNav></BottomNav>
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
