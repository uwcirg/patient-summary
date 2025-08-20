import React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Summary from "@components/Summary";
import { isEmptyArray } from "@util";

export default function Summaries({ hasSummaryData, questionnaireKeys, summaryData }) {
  if (isEmptyArray(questionnaireKeys)) {
    return <Alert severity="error">No matching data found.</Alert>;
  }
  if (summaryData && summaryData.error) {
    return <Alert severity="error">Error loading data.</Alert>;
  }
  if (!hasSummaryData) {
    return <Alert severity="warning">No data found.</Alert>;
  }
  const keys = Object.keys(summaryData.data);
  if (isEmptyArray(keys)) return <Alert severity="warning">No data found.</Alert>;
  return (
    <Box>
      {keys.map((questionnaireId, index) => {
        const dataObject =
          summaryData.data && summaryData.data[questionnaireId] ? summaryData.data[questionnaireId] : null;
        if (!dataObject) return null;
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
                sx={{ borderWidth: "2px", marginBottom: 2 }}
              ></Divider>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

Summaries.propTypes = {
  questionnaireKeys: PropTypes.array,
  summaryData: PropTypes.object,
  hasSummaryData: PropTypes.bool
};
