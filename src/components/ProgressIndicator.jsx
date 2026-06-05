import React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";


export default function ProgressIndicator({ resources, sx }) {
  const total = resources?.length;
  const loaded = resources?.filter(
    (resource) => resource.complete || resource.error
  ).length;
  if (total === 0) return false;
  return (
    <Box
      sx={(theme) => ({
        position: "fixed",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFF",
        marginLeft: "auto",
        marginRight: "auto",
        left: 0,
        top: theme.spacing(4),
        zIndex: theme.zIndex.drawer + 1,
        padding: theme.spacing(2, 2),
        ...(typeof sx === "function" ? sx(theme) : sx),
      })}
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

          marginTop: 1,
          marginBottom: 4,
          padding: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "center",
            alignItems: "center",
            fontSize: "1.1rem",
            marginBottom: 1.25,
          }}
        >
          <div>Loading ...</div>
          <div>
            <b>{Math.ceil((loaded / total) * 100)} %</b>
          </div>
        </Stack>
        <Stack
          direction="column"
          spacing={1}
          sx={{
            alignItems: "flex-start",
          }}
        >
          {resources.map((resource, index) => {
            const { title, name, id } = resource;
            const displayName = title || name || `Resource ${id ?? index + 1}`;
            return (
              <Stack
                direction="row"
                spacing={2}
                key={`resource_${resource}_${index}`}
                sx={{
                  justifyContent: "flex-start",
                }}
              >
                <Typography
                  variant="body1"
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
                {resource.complete && resource.error && <CloseIcon color="error"></CloseIcon>}
                {resource.complete && !resource.error && <CheckIcon color="success"></CheckIcon>}
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
  sx: PropTypes.object
};
