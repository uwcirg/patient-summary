import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorComponent from "./ErrorComponent";
import { DEFAULT_ACCORDION_HEADER_HEIGHT } from "@/consts";

export default function Section({ section, data }) {
  const theme = useTheme();
  if (!section) return false;
  const sectionId = section.id.toLowerCase();
  const renderAnchorElement = () => (
    <Box
      id={`anchor_${section.id.toLowerCase()}`}
      key={`${section.id}_anchorContainer`}
      sx={{
        position: "relative",
        top: -1 * parseInt(DEFAULT_ACCORDION_HEADER_HEIGHT),
        height: "1px",
        width: "1px",
      }}
    ></Box>
  );
  const renderSectionTitle = () => (
    <Stack
      spacing={1}
      direction={"row"}
      justifyContent={"center"}
      alignItems={"center"}
    >
      {section.icon({ color: "#FFF" })}
      <Typography variant="h6" component="h2" id={`${sectionId}_title`}>
        {section.title}
      </Typography>
    </Stack>
  );
  return (
    <Box
      key={"accordion_wrapper_" + sectionId}
      className="accordion-wrapper"
      sx={{
        marginBottom: theme.spacing(1),
      }}
    >
      {renderAnchorElement()}
      <Accordion
        key={`section_${sectionId}`}
        disableGutters={true}
        defaultExpanded={
          section.expanded ? section.expanded : true
        }
        sx={{
          "& .MuiAccordionSummary-content": {
            margin: 0,
          },
          "& .MuiPaper-root": {
            borderRadius: 0,
          },
        }}
      >
        <AccordionSummary
          expandIcon={
            <ExpandMoreIcon sx={{ color: "#FFF" }} className="print-hidden" />
          }
          aria-controls={`${sectionId}_summary_title`}
          id={`accordion_${sectionId}`}
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: "#FFF",
            borderBottom: "1px solid #FFF",
          }}
        >
          {renderSectionTitle()}
        </AccordionSummary>
        <AccordionDetails sx={{ padding: theme.spacing(1, 0.5) }}>
          {section.component && section.component(data)}
          {!section.component && (
            <ErrorComponent message="no section component to render"></ErrorComponent>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

Section.propTypes = {
  section: PropTypes.object,
  data: PropTypes.object
}
