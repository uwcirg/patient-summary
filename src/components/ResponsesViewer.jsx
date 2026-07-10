import React, { useState, forwardRef } from "react";
import PropTypes from "prop-types";
import { AppBar, Box, Button, Dialog, IconButton, Slide, Stack, Toolbar, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import QuestionnaireInfo from "./QuestionnaireInfo";
import ResponsesTable from "./ResponsesTable";

/**
 * Local transition for the full-screen dialog
 */
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function ResponsesViewer({
  note,
  title,
  subtitle,
  tableData = [],
  columns,
  headerBgColor,
  buttonStyle,
  buttonLabel = "History",
  buildColumns, // (optional) function: () => columns[]
  responsesTileTitle = "Responses", // header above the button, mirrors your summary tile
  questionnaire, // questionnaire JSON, for info popup
}) {
  const [open, setOpen] = useState(false);
  const resolvedHeaderBg = headerBgColor ?? "#FFF";

  return (
    <>
      <Stack
        direction={"column"}
        sx={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
          gap: 1.25,
          height: "100%"
        }}>
        <Box sx={{ width: "100%" }}>
          <Typography
            component="h3"
            variant="subtitle2"
          >
            {responsesTileTitle}
          </Typography>
          {subtitle && (
            <Typography component="h4" variant="caption">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Button
          color="link"
          title="View responses by date"
          size="small"
          onClick={() => setOpen(true)}
          variant="outlined"
          className="print-hidden"
          sx={[{
            fontSize: "0.8rem"
          }, (typeof buttonStyle === "object" && buttonStyle) || {}]}
        >
          {buttonLabel}
        </Button>
      </Stack>
      {/* Full-screen dialog */}
      <Dialog
        fullScreen
        open={open}
        onClose={() => setOpen(false)}
        transitionDuration={{ enter: 500, exit: 500 }}
        slots={{
          transition: Transition
        }}
      >
        <AppBar sx={{ position: "relative", minHeight: "48px" }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setOpen(false)} aria-label="close">
              <CloseIcon />
            </IconButton>

            <Typography sx={{ ml: 2, flex: 1 }} variant="h5" component="h2">
              <Stack
                direction={"row"}
                sx={{
                  gap: 1,
                  alignItems: "center"
                }}>
                {title}
                {questionnaire && (
                  <QuestionnaireInfo
                    questionnaireJson={questionnaire}
                    note={note}
                    buttonSize="medium"
                  ></QuestionnaireInfo>
                )}
              </Stack>
            </Typography>

            <Button color="inherit" onClick={() => setOpen(false)}>
              Close
            </Button>
          </Toolbar>
        </AppBar>

        {/* Table inside the dialog */}
        <ResponsesTable
          tableData={tableData}
          columns={columns}
          buildColumns={buildColumns}
          headerBgColor={resolvedHeaderBg}
        />
      </Dialog>
    </>
  );
}

ResponsesViewer.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  note: PropTypes.string,
  tableData: PropTypes.array,
  columns: PropTypes.array, //if omitted, auto-build simple columns
  headerBgColor: PropTypes.string,
  buttonLabel: PropTypes.string, // ("View" default)
  buttonStyle: PropTypes.object, // style object for the button
  buildColumns: PropTypes.func, //  hook to compute columns
  responsesTileTitle: PropTypes.node, // ("Responses" default)
  questionnaire: PropTypes.object, //  questionnaire JSON object
};
