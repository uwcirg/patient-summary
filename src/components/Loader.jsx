import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";

export default function Loader({ message, styles }) {
  return (
    <Box
      sx={{
        position: "fixed",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFF",
        marginLeft: "auto",
        marginRight: "auto",
        left: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
        padding: (theme) => theme.spacing(2, 2),
        ...(styles ?? {}),
      }}
    >
      <Stack
        sx={{
          marginTop: 1,
          marginBottom: 4,
          padding: 2,
        }}
        alignItems={{
          xs: "flex-start",
          sm: "center",
        }}
        direction="column"
        spacing={2}
        className="progress-container"
      >
        <Stack
          direction="row"
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ fontSize: "1.1rem", marginBottom: 1.25 }}
        >
          <div>{message ? message : "Please wait ..."}</div>
          <CircularProgress color="info"></CircularProgress>
        </Stack>
      </Stack>
    </Box>
  );
}
Loader.propTypes = {
  message: PropTypes.string,
  styles: PropTypes.object,
};
