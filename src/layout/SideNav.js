import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { useState } from "react";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Divider from "@mui/material/Divider";
import SectionList from "../components/SectionList";
import { MOBILE_DRAWER_WIDTH, DEFAULT_DRAWER_WIDTH } from "../consts/consts";

const openedMixin = (theme) => ({
  width: MOBILE_DRAWER_WIDTH,
  [theme.breakpoints.up("lg")]: {
    width: DEFAULT_DRAWER_WIDTH,
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
  width: `calc(${theme.spacing(7.5)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8.5)} + 1px)`,
  },
});

const DrawerHeader = styled("div", {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: open ? "flex-end" : "center",
  backgroundColor: "#FFF",
  padding: theme.spacing(1, 1, 0.5),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  minHeight: `${theme.spacing(7)} !important`,
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  width: { MOBILE_DRAWER_WIDTH },
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

export default function SideNav (props) {
   
    const {sections} = props;
    const [open, setOpen] = useState(true);
    const handleDrawerOpen = () => {
      setOpen(true);
    };

    const handleDrawerClose = () => {
      setOpen(false);
    };
    const renderDrawerHeaderButton = () => (
      <DrawerHeader open={open}>
        <IconButton
          onClick={open ? handleDrawerClose : handleDrawerOpen}
          title="collapse/expand"
        >
          {open && <ChevronLeftIcon color="primary" />}
          {!open && <ChevronRightIcon color="primary" />}
        </IconButton>
      </DrawerHeader>
    );
    if (!sections || !sections.length) return null;
    return (
      <Drawer
        variant="permanent"
        className="print-hidden"
        open={open}
        sx={{
          display: {
            xs: "none",
            sm: "none",
            md: "block",
          },
        }}
        PaperProps={{
          sx: {
            backgroundColor: (theme) => theme.palette.background.main,
          },
        }}
      >
        <Toolbar variant="dense"/>
        {renderDrawerHeaderButton()}
        <Divider />
        <Box>
          <SectionList list={sections} expanded={open}></SectionList>
        </Box>
      </Drawer>
    );
}

SideNav.propTypes = {
  sections: PropTypes.array,
};
