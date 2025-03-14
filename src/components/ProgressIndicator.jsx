import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { shouldShowNav } from "../util/util";

import { DEFAULT_DRAWER_WIDTH, MOBILE_DRAWER_WIDTH } from "../consts/consts";

export default function ProgressIndicator({ resources }) {
  const total = resources?.length;
  const loaded = resources?.filter(
    (resource) => resource.complete || resource.error
  ).length;
  if (total === 0) return false;
  return (
    <Box
      sx={{
        position: "fixed",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFF",
        marginLeft: shouldShowNav()
          ? {
              md: -1 * parseInt(MOBILE_DRAWER_WIDTH) + "px",
              lg: -1 * parseInt(DEFAULT_DRAWER_WIDTH) + "px",
            }
          : "auto",
        marginRight: "auto",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        padding: (theme) => theme.spacing(2, 2),
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
        justifyContent="center"
        direction="column"
        spacing={2}
      >
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ fontSize: "1.1rem", marginBottom: 1.25 }}
        >
          <div>Loading Data ...</div>
          <div>
            <b>{Math.ceil((loaded / total) * 100)} %</b>
          </div>
          <CircularProgress color="info"></CircularProgress>
        </Stack>
        <Stack direction="column" alignItems="flex-start" spacing={1}>
          {resources.map((resource, index) => {
            const { title, name, id } = resource;
            const displayName = title || name || `Resource ${id??index+1}`;
            return (
              <Stack
                direction="row"
                spacing={2}
                justifyContent="flex-start"
                key={`resource_${resource}_${index}`}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: (theme) =>
                      resource.error
                        ? theme.palette.error.main
                        : resource.complete
                        ? theme.palette.success.main
                        : theme.palette.warning.main,
                  }}
                >
                  {String(displayName).toUpperCase()}
                </Typography>
                {resource.complete && resource.error && (
                  <CloseIcon color="error"></CloseIcon>
                )}
                {resource.complete && !resource.error && (
                  <CheckIcon color="success"></CheckIcon>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Box>
  );
}

ProgressIndicator.propTypes = {
  resources: PropTypes.arrayOf(
    PropTypes.shape({
      complete: PropTypes.bool,
      error: PropTypes.bool,
      name: PropTypes.string,
      title: PropTypes.string,
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ),
};
