import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorComponent from "./ErrorComponent";
import { DEFAULT_ACCORDION_HEADER_HEIGHT } from "@/consts";

// Generic placeholder content shown while a section's dependencies are
// still loading. Shape is deliberately generic (not chart/table-specific)
// since a single section type can back charts, tables, or report text.
const SectionSkeleton = React.memo(function SectionSkeleton() {
  return (
    <Stack spacing={1} sx={{ padding: (theme) => theme.spacing(1, 0.5) }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: "center", alignItems: "center" }}>
        <Skeleton variant="rectangular" height={120} width="40%" />
        <Skeleton variant="rectangular" height={120} width="60%" />
      </Stack>
    </Stack>
  );
});

export default function Section({ section, data, ready }) {
  const theme = useTheme();
  if (!section) return false;
  const sectionId = section.id?.toLowerCase();
  if (!sectionId) return null;
  const isReady = ready !== false; 
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
      sx={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {section.icon && section.icon({ color: "#FFF" })}
      <Typography className="section-title" variant="h6" component="span" id={`${sectionId}_title`}>
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
      {section.standalone && (
        <Paper
          className="section-wrapper"
          sx={(theme) => ({
            padding: theme.spacing(1),
          })}
          elevation={0}
        >
          {isReady ? section.component(data) : <SectionSkeleton />}
        </Paper>
      )}
      {!section.standalone && (
        <Accordion
          key={`section_${sectionId}`}
          disableGutters={true}
          defaultExpanded={section.expanded ? section.expanded : true}
          sx={[
            {
              "& .MuiAccordionSummary-content": {
                margin: 0,
              },
              "& .MuiPaper-root": {
                borderRadius: 0,
              },
            },
            section.sx ?? {},
          ]}
          component="div"
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: "#FFF" }} className="print-hidden" />}
            aria-controls={`${sectionId}-summary-content`}
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
            {!isReady && <SectionSkeleton />}
            {isReady && section.component && section.component(data)}
            {isReady && !section.body && !section.component && (
              <ErrorComponent message="no section component to render"></ErrorComponent>
            )}
            {isReady && section.body && <section>{section.body}</section>}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

Section.propTypes = {
  section: PropTypes.object,
  data: PropTypes.object,
  ready: PropTypes.bool,
};
