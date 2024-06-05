import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Summary from "../Summary";

export default function Summaries({questionnaireKeys, summaryData}) {
  if (!questionnaireKeys || !questionnaireKeys.length) {
    return <Alert severity="error">No matching data found.</Alert>;
  }
  if (!summaryData) {
    return <Alert severity="warning">No data found.</Alert>
  }
  return (
    <Box>
      {questionnaireKeys.map((questionnaireId, index) => {
        const dataObject =
          summaryData.data && summaryData.data[questionnaireId]
            ? summaryData.data[questionnaireId]
            : null;
        if (!dataObject) return <Alert severity="warning">No data found.</Alert>;
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
                light
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
