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
  // Optional advanced mode:
  buildColumns, // (optional) function: () => columns[]
  responsesTileTitle = "Responses", // header above the button, mirrors your summary tile
  questionnaire, // questionnaire JSON, for info popup
}) {
  const [open, setOpen] = useState(false);
  const resolvedHeaderBg = headerBgColor ?? "#FFF";

  return (
    <>
      <Stack
        sx={{ height: "100%" }}
        direction={"column"}
        justifyContent={"flex-start"}
        alignItems={"flex-start"}
        gap={1}
      >
        <Box sx={{ width: "100%" }}>
          <Typography
            component="h3"
            variant="subtitle2"
            // sx={{
            //   textAlign: "center",
            // }}
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
          sx={{ fontSize: "0.8rem", ...((typeof buttonStyle === "object" && buttonStyle) || {}) }}
        >
          {buttonLabel}
        </Button>
      </Stack>

      {/* Full-screen dialog */}
      <Dialog
        fullScreen
        open={open}
        onClose={() => setOpen(false)}
        TransitionComponent={Transition}
        transitionDuration={{ enter: 500, exit: 500 }}
      >
        <AppBar sx={{ position: "relative", minHeight: "48px" }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setOpen(false)} aria-label="close">
              <CloseIcon />
            </IconButton>

            <Typography sx={{ ml: 2, flex: 1 }} variant="h5" component="h2">
              <Stack gap={1} alignItems={"center"} direction={"row"}>
                {title}
                {questionnaire && (
                  <QuestionnaireInfo
                    questionnaireJson={questionnaire}
                    note={note}
                    buttonSize="small"
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
  columns: PropTypes.array, // optional, if omitted, auto-build simple columns
  headerBgColor: PropTypes.string, // optional
  buttonLabel: PropTypes.string, // optional ("View" default)
  buttonStyle: PropTypes.object, // optional style object for the button
  buildColumns: PropTypes.func, // optional hook to compute columns
  responsesTileTitle: PropTypes.node, // optional ("Responses" default)
  questionnaire: PropTypes.object, // optional, questionnaire JSON object
};
