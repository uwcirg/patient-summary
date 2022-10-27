//import { useContext } from "react";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { getEnv, imageOK } from "../util/util";

export default function Header() {
  const theme = useTheme();
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
  const renderTitle = () => (
    <Typography
      variant="h4"
      component="h1"
      sx={{ fontSize: { xs: "1.1rem", md: "1.8rem" } }}
    >
      Patient Summary
    </Typography>
  );
  const renderLogo = () => (
    <img
      className="header-logo"
      src={`/assets/${getEnv("REACT_APP_PROJECT_ID")}/img/logo.png`}
      alt={"project logo"}
      onLoad={handleImageLoaded}
      onError={handleImageLoaded}
    ></img>
  );
  const renderReturnButton = () => {
    const returnURL = getEnv("REACT_APP_DASHBOARD_URL");
    if (!returnURL) return null;
    return (
      <Box sx={{ flex: 1, textAlign: "right", marginTop: 1, marginBotton: 1 }}>
        <Button
          color="primary"
          href={returnURL + "/clear_session"}
          variant="contained"
        >
          Patient List
        </Button>
      </Box>
    );
  };
  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar
        sx={{
          backgroundColor: theme.palette.lighter
            ? theme.palette.lighter.main
            : "#FFF",
          color: theme.palette.secondary
            ? theme.palette.secondary.main
            : "#444",
        }}
      >
        <Stack
          direction={"row"}
          spacing={2}
          alignItems="center"
          sx={{ width: "100%" }}
        >
          {renderLogo()}
          {renderTitle()}
          {renderReturnButton()}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
