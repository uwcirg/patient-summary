import PropTypes from "prop-types";
import { useRef, useContext, useState } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Grow from "@mui/material/Grow";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreIcon from "@mui/icons-material/MoreVert";
import SummarizeIcon from "@mui/icons-material/Summarize";
import PrintIcon from "@mui/icons-material/Print";
import { getEnv, getEnvProjectId, imageOK } from "../util/util";
import PatientInfo from "./PatientInfo";
import { FhirClientContext } from "../context/FhirClientContext";

export default function Header(props) {
  const theme = useTheme();
  const { patient } = useContext(FhirClientContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const anchorRef = useRef(null);

  const { returnURL, inEHR } = props;
  const handleImageLoaded = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.classList.add("invisible");
      return;
    }
    e.target.classList.remove("invisible");
  };
  const renderTitle = () => {
    const appTitle = getEnv("REACT_APP_TITLE") || "Patient Summary";
    return (
      <>
        <Typography
          variant="h4"
          component="h1"
          color="primary"
          dark
          sx={{
            fontSize: inEHR ? "1.6rem" : "1.8rem",
            display: { xs: "none", sm: "none", md: "block" },
          }}
        >
          {appTitle}
        </Typography>
        <Typography className="print-only" component="h5" variant="h5">
          {appTitle}
        </Typography>
      </>
    );
  };

  const renderLogo = () => {
    const projectID = getEnvProjectId();
    if (!projectID)
      return (
        <SummarizeIcon fontSize="large" color="primary" dark></SummarizeIcon>
      );
    else
      return (
        <>
          <Box
            sx={{
              display: {
                xs: "none",
                sm: "none",
                md: "inline-flex",
              },
            }}
          >
            <img
              className="header-logo"
              src={`/assets/${getEnvProjectId()}/img/logo.png`}
              alt={"project logo"}
              style={{
                width: 152,
              }}
              onLoad={handleImageLoaded}
              onError={handleImageLoaded}
            ></img>
          </Box>
          <Box
            sx={{
              display: {
                xs: "inline-flex",
                sm: "inline-flex",
                md: "none",
              },
            }}
          >
            <img
              src={`/assets/${getEnvProjectId()}/img/logo_mobile.png`}
              alt={"project logo"}
              onLoad={handleImageLoaded}
              onError={handleImageLoaded}
            ></img>
          </Box>
        </>
      );
  };
  const renderPatientInfo = () => <PatientInfo patient={patient}></PatientInfo>;
  const renderPrintButton = (props) => {
    return (
      <Button
        className="print-hidden"
        onClick={() => window.print()}
        startIcon={<PrintIcon></PrintIcon>}
        size="medium"
        variant="outlined"
        sx={{
          backgroundColor: "#FFF",
        }}
        {...props}
      >
        Print
      </Button>
    );
  };
  const renderReturnButton = (props) => {
    if (!returnURL) return null;
    if (inEHR) return null;
    return (
      <Box className="print-hidden">
        <Button
          color="primary"
          href={returnURL + "/clear_session"}
          className="btn-return-url"
          startIcon={<ArrowBackIcon></ArrowBackIcon>}
          size="medium"
          variant="contained"
          {...props}
        >
          Patient List
        </Button>
      </Box>
    );
  };
  const renderSideMenu = () => {
    return (
      <Stack
        flexDirection="row"
        flexGrow={1}
        justifyContent="flex-end"
        alignItems="center"
        sx={{
          columnGap: theme.spacing(1.5),
          display: {
            xs: "none",
            sm: "inline-flex",
          },
        }}
      >
        {renderReturnButton()}
        {renderPrintButton()}
      </Stack>
    );
  };
  const renderMobileMenu = () => (
    <>
      <IconButton
        sx={{
          display: {
            sx: "inline-flex",
            sm: "none",
          },
        }}
        ref={anchorRef}
        aria-controls={mobileOpen ? "composition-menu" : undefined}
        aria-expanded={mobileOpen ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleMobileMenuToggle}
        className="print-hidden"
      >
        <MoreIcon></MoreIcon>
      </IconButton>
      <Popper
        open={mobileOpen}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-start"
        transition
        disablePortal
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom-start" ? "left top" : "left bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleMobileMenuClose}>
                <MenuList
                  autoFocusItem={mobileOpen}
                  id="composition-menu"
                  aria-labelledby="composition-button"
                  onKeyDown={handleListKeyDown}
                >
                  <MenuItem>
                    {renderReturnButton({
                      variant: "text",
                    })}
                  </MenuItem>
                  <MenuItem>
                    {renderPrintButton({
                      variant: "text",
                    })}
                  </MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
  const handleMobileMenuClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }

    setMobileOpen(false);
  };
  const handleMobileMenuToggle = () => {
    setMobileOpen((prevOpen) => !prevOpen);
  };
  const handleListKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      setMobileOpen(false);
    } else if (event.key === "Escape") {
      setMobileOpen(false);
    }
  };
  return (
    <AppBar
      position="fixed"
      elevation={1}
      sx={{ paddingRight: "0 !important", paddingLeft: "0 !important" }}
    >
      <Toolbar
        sx={{
          backgroundColor: theme.palette.lighter
            ? theme.palette.lighter.main
            : "#FFF",
          color: theme.palette.secondary
            ? theme.palette.secondary.main
            : "#444",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
        }}
        disableGutters
        variant="dense"
      >
        <Stack
          direction={"row"}
          spacing={{
            xs: 1,
            sm: 1,
            md: 1.5,
          }}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          {renderLogo()}
          {renderTitle()}
          <Stack direction={"row"} sx={{ flex: "1 1" }} alignItems="center">
            {!inEHR && renderPatientInfo()}
            {renderSideMenu()}
          </Stack>
          {renderMobileMenu()}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

Header.propTypes = {
  returnURL: PropTypes.string,
  inEHR: PropTypes.bool,
};
