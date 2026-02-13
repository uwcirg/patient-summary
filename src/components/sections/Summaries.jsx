import React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Summary from "@components/Summary";
import { isEmptyArray } from "@util";

export default function Summaries({ summaryError, summaries }) {
  if (summaryError) {
    return <Alert severity="error">Error loading data.</Alert>;
  }
  if (!summaries) {
    return <Alert severity="warning">No data found.</Alert>;
  }
  const keys = Object.keys(summaries);
  if (isEmptyArray(keys)) return <Alert severity="warning">No data found.</Alert>;

  return (
    <Box>
      {keys.map((questionnaireId, index) => {
        const dataObject = summaries[questionnaireId]??{};
        return (
          <Box className="summary-container" key={`summary_${questionnaireId}_${index}`}>
            <Summary
              questionnaireId={questionnaireId}
              data={dataObject}
              key={`questionnaire_summary_${index}`}
            ></Summary>
            {index !== keys.length - 1 && (
              <Divider
                className="print-hidden"
                key={`questionnaire_divider_${index}`}
                sx={{ borderWidth: "2px", marginBottom: 2, opacity: 0.6 }}
                variant="middle"
              ></Divider>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

Summaries.propTypes = {
  summaries: PropTypes.object,
  summaryError: PropTypes.bool
};
