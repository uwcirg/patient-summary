import { useState } from "react";
import { useTheme, styled } from "@mui/material/styles";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { getSectionsToShow } from "../util/util";
import SectionList from "./SectionList";
import {DEFAULT_DRAWER_WIDTH} from "../consts/consts";

export default function BottomNav() {
  const sections = getSectionsToShow();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const toggleDrawer = () => setOpen(!open);
  const mediaDisplays = {
    xs: "block",
    sm: "block",
    md: "none",
    lg: "none",
  };
  const renderDrawer = () => (
    <Drawer
      open={open}
      sx={{
        display: mediaDisplays,
      }}
    >
      <Box sx={{ width: DEFAULT_DRAWER_WIDTH }}>
        <Toolbar sx={{ paddingRight: 0, paddingLeft: 0 }} />
        <DrawerHeader>
          <IconButton onClick={() => setOpen(false)} title="close">
            <CloseIcon></CloseIcon>
          </IconButton>
        </DrawerHeader>
        <Divider></Divider>
        <SectionList
          list={sections}
          onClickEvent={() => {
            setOpen(false);
          }}
          expanded={true}
        ></SectionList>
      </Box>
    </Drawer>
  );
  const DrawerHeader = styled("div")(({ theme }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: theme.spacing(0, 1.5),
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
  }));

  if (!sections || !sections.length) return null;

  return (
    <>
      {renderDrawer()}
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: mediaDisplays,
          zIndex: (theme) => theme.zIndex.drawer
        }}
        elevation={5}
      >
        <BottomNavigation
          sx={{
            backgroundColor: theme.palette.lighter
              ? theme.palette.lighter.main
              : "#FFF",
          }}
          showLabels
        >
          <BottomNavigationAction
            label={
              <Typography color="primary" variant="body2">
                Go to Section
              </Typography>
            }
            icon={<LocationOnIcon color="primary" />}
            onClick={() => toggleDrawer()}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
}
