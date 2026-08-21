import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { getAppHeight } from "@util";
export default function Loader({ message, styles, variant = "fullScreen", children }) {
  return (
    <Box
      className="print-hidden"
      sx={[
        variant === "fullScreen"
          ? (theme) => ({
              position: "fixed",
              width: "100%",
              height: "100%",
              minHeight: getAppHeight(),
              backgroundColor: "#FFFFFF",
              marginLeft: "auto",
              marginRight: "auto",
              top: theme.spacing(8),
              left: 0,
              zIndex: theme.zIndex.drawer + 1,
              padding: (t) => t.spacing(2, 2),
            })
          : {
              position: "relative",
              width: "auto",
              minHeight: 120,
              padding: (t) => t.spacing(2),
            },
        styles ?? {},
      ]}
    >
      <Stack
        direction="column"
        spacing={2}
        className="progress-container"
        sx={{
          alignItems: {
            xs: "flex-start",
            sm: "center",
          },
          padding: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={4}
          sx={{
            justifyContent: "center",
            alignItems: "center",
            fontSize: "1.1rem",
          }}
        >
          <CircularProgress color="info" role="progressbar" aria-label="Loading"></CircularProgress>
          <div>{message ? message : "Please wait ..."}</div>
        </Stack>
        {children}
      </Stack>
    </Box>
  );
}
Loader.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
  message: PropTypes.string,
  styles: PropTypes.object,
  variant: PropTypes.oneOf(["fullScreen", "inline"]),
};
