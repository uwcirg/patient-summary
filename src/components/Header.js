import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { getEnv, imageOK } from "../util/util";

export default function Header(props) {
  const theme = useTheme();
  const {returnURL} = props;
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
    if (!returnURL) return null;
    return (
      <Box className="print-hidden" sx={{ flex: 1, textAlign: "right", marginTop: 1, marginBotton: 1 }}>
        <Button
          color="primary"
          href={returnURL + "/clear_session"}
          variant="contained"
          className="btn-return-url"
        >
          Patient List
        </Button>
      </Box>
    );
  };
  return (
    <AppBar position="fixed" elevation={1} sx={{paddingRight: "0 !important", paddingLeft: "0 !important"}}>
      <Toolbar
        sx={{
          backgroundColor: theme.palette.lighter
            ? theme.palette.lighter.main
            : "#FFF",
          color: theme.palette.secondary
            ? theme.palette.secondary.main
            : "#444",
          zIndex: (theme) => theme.zIndex.drawer + 1,
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

Header.propTypes = {
  returnURL: PropTypes.string,
};