import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import {getAppHeight} from "@util";
export default function Loader({ message, styles, children }) {
  return (
    <Box
      sx={[theme => ({
        position: "fixed",
        width: "100%",
        height: "100%",
        minHeight: getAppHeight(),
        backgroundColor: "#FFF",
        marginLeft: "auto",
        marginRight: "auto",
        top: 0,
        left: 0,
        zIndex: theme.zIndex.drawer + 1,
        padding: theme.spacing(2, 2)
      }), styles ?? {}]}
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

          marginTop: 8,
          marginBottom: 4,
          padding: 2
        }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "center",
            alignItems: "center",
            fontSize: "1.1rem",
            marginBottom: 1.25
          }}>
          <div>{message ? message : "Please wait ..."}</div>
          <CircularProgress color="info"></CircularProgress>
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
};
