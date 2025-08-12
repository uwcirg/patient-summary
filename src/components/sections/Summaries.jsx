import React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Summary from "@components/Summary";
import { isEmptyArray } from "@util";

export default function Summaries({ questionnaireKeys, summaryData }) {
  const hasSummaryData = () => {
    if (!summaryData || !summaryData.data) return false;
    const keys = Object.keys(summaryData.data);
    return keys.find(
      (key) => summaryData.data[key] && (summaryData.data[key].error || !isEmptyArray(summaryData.data[key].responses)),
    );
  };
  if (!questionnaireKeys || !questionnaireKeys.length) {
    return <Alert severity="error">No matching data found.</Alert>;
  }
  if (summaryData.error) {
    return <Alert severity="error">Error loading data.</Alert>;
  }
  if (!hasSummaryData()) {
    return <Alert severity="warning">No data found.</Alert>;
  }
  return (
    <Box>
      {questionnaireKeys.map((questionnaireId, index) => {
        const dataObject =
          summaryData.data && summaryData.data[questionnaireId] ? summaryData.data[questionnaireId] : null;
        if (!dataObject) return null;
        return (
          <Box className="summary-container" key={`summary_${questionnaireId}`}>
            <Summary
              questionnaireId={questionnaireId}
              data={dataObject}
              key={`questionnaire_summary_${index}`}
            ></Summary>
            {index !== questionnaireKeys.length - 1 && (
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
};
