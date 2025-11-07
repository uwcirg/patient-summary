import PropTypes from "prop-types";
import React, { useRef, useContext, useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import { Divider } from "@mui/material";
import Grow from "@mui/material/Grow";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreIcon from "@mui/icons-material/MoreVert";
import PrintIcon from "@mui/icons-material/LocalPrintshopOutlined";
import DashboardIcon from "@mui/icons-material/DashboardOutlined";
import {
  isImagefileExist,
  getEnv,
  getEnvProjectId,
  getSectionsToShow,
  imageOK,
  scrollToElement,
  toAbsoluteUrl,
} from "../util";
import PatientInfo from "../components/PatientInfo";
import { FhirClientContext } from "../context/FhirClientContext";

export default function Header(props) {
  const theme = useTheme();
  const { patient } = useContext(FhirClientContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const anchorRef = useRef(null);
  const desktopImgRef = useRef(null);
  const mobileImgRef = useRef(null);
  const sections = getSectionsToShow();
  const shouldShowSections = sections && sections.length > 1;

  const { returnURL, inEHR } = props;
  const getDesktopImgSrc = async () => {
    const projectUrl = toAbsoluteUrl(`/assets/${getEnvProjectId()}/img/logo.png`);
    const ok = await isImagefileExist(projectUrl).catch(() => false);
    return ok ? projectUrl : toAbsoluteUrl(`/assets/default/img/logo.png`);
  };
  const getMobileImgSrc = async () => {
    const projectUrl = toAbsoluteUrl(`/assets/${getEnvProjectId()}/img/logo_mobile.png`);
    const ok = await isImagefileExist(projectUrl).catch(() => false);
    return ok ? projectUrl : toAbsoluteUrl(`/assets/default/img/logo_mobile.png`);
  };
  const handleImageLoaded = (e) => {
    if (!e.target) {
      return false;
    }
    let imageLoaded = imageOK(e.target);
    if (!imageLoaded) {
      e.target.classList.add("ghost");
      return;
    }
    e.target.classList.remove("ghost");
  };
  const shouldHideReturnButton = () => !returnURL || inEHR;

  const renderTitle = () => {
    const appTitle = getEnv("REACT_APP_TITLE") || "Patient Summary";
    return (
      <>
        <Typography
          variant="h4"
          component="h1"
          color="primary"
          sx={{
            fontSize: inEHR ? "1.6rem" : "1.8rem",
            display: inEHR ? "block" : { xs: "none", sm: "none", md: "block" },
          }}
          className="print-hidden"
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
    if (!projectID) return <DashboardIcon fontSize="large" color="primary"></DashboardIcon>;
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
            <button
              onClick={() => (window.location = returnURL + "/clear_session")}
              style={{
                background: "none",
                border: 0,
              }}
            >
              <img
                className="logo header-logo ghost"
                ref={desktopImgRef}
                alt={"project logo"}
                style={{
                  height: 40,
                  cursor: "pointer",
                }}
                onLoad={handleImageLoaded}
                onError={handleImageLoaded}
              ></img>
            </button>
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
            <button
              onClick={() => (window.location = returnURL + "/clear_session")}
              style={{
                background: "none",
                border: 0,
              }}
            >
              <img
                ref={mobileImgRef}
                alt={"project logo"}
                onLoad={handleImageLoaded}
                onError={handleImageLoaded}
                className="logo ghost"
                style={{
                  cursor: "pointer",
                  height: 40,
                }}
              ></img>
            </button>
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
  const renderDesktopMenu = () => {
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
            sm: "none",
            md: "none",
            lg: "none",
            xl: "inline-flex",
          },
        }}
      >
        {!shouldHideReturnButton() && renderReturnButton()}
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
            sm: "inline-flex",
            md: "inline-flex",
            lg: "inline-flex",
            xl: "none",
          },
        }}
        ref={anchorRef}
        aria-controls={mobileMenuOpen ? "composition-menu" : undefined}
        aria-expanded={mobileMenuOpen ? "true" : undefined}
        aria-haspopup="true"
        onClick={handleMobileMenuToggle}
        className="print-hidden"
        title="Menu"
      >
        <MoreIcon color="primary" fontSize="large"></MoreIcon>
      </IconButton>
      <Popper
        open={mobileMenuOpen}
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
              transformOrigin: placement === "bottom-start" ? "left top" : "left bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleMobileMenuClose}>
                <MenuList
                  autoFocusItem={mobileMenuOpen}
                  id="composition-menu"
                  aria-labelledby="composition-button"
                  onKeyDown={handleListKeyDown}
                >
                  {!shouldHideReturnButton() && (
                    <Box>
                      <MenuItem>
                        {renderReturnButton({
                          variant: "text",
                        })}
                      </MenuItem>
                      <Divider></Divider>
                    </Box>
                  )}
                  {shouldShowSections &&
                    sections.map((section, index) => (
                      <MenuItem
                        onClick={(e) => {
                          scrollToElement(`anchor_${section.id.toLowerCase()}`);
                          handleMobileMenuClose(e);
                        }}
                        key={`${section.id ?? index}_menuitem`}
                      >
                        <ListItemIcon>{section.icon({ fontSize: "small" })}</ListItemIcon>
                        <ListItemText>{section.title}</ListItemText>
                      </MenuItem>
                    ))}
                  {shouldShowSections && <Divider sx={{ display: "none" }}></Divider>}
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

    setMobileMenuOpen(false);
  };
  const handleMobileMenuToggle = () => {
    setMobileMenuOpen((prevOpen) => !prevOpen);
  };
  const handleListKeyDown = (event) => {
    if (event.key === "Tab") {
      event.preventDefault();
      setMobileMenuOpen(false);
    } else if (event.key === "Escape") {
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    const onResize = () => setMobileMenuOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!desktopImgRef.current) return;
    getDesktopImgSrc().then((url) => (desktopImgRef.current.src = url));
  }, []);

  useEffect(() => {
    if (!mobileImgRef.current) return;
    getMobileImgSrc().then((url) => (mobileImgRef.current.src = url));
  }, []);

  return (
    <>
      <AppBar position="fixed" elevation={1} sx={{ paddingRight: "0 !important", paddingLeft: "0 !important" }}>
        <Toolbar
          sx={{
            backgroundColor: theme.palette.lighter ? theme.palette.lighter.main : "#FFF",
            color: theme.palette.secondary ? theme.palette.secondary.main : "#444",
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
              md: 1.25,
            }}
            alignItems="center"
            sx={{ width: "100%" }}
          >
            {renderLogo()}
            {renderTitle()}
            <Stack direction={"row"} sx={{ flex: "1 1" }} alignItems="center">
              {!inEHR && renderPatientInfo()}
              {renderDesktopMenu()}
            </Stack>
            {renderMobileMenu()}
          </Stack>
        </Toolbar>
      </AppBar>
    </>
  );
}

Header.propTypes = {
  returnURL: PropTypes.string,
  inEHR: PropTypes.bool,
};
