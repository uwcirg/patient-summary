import React from "react";
import { styled, useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { isEmptyArray, isNumber } from "@util";
import Score from "./Score";
import ScoringSummary from "./sections/ScoringSummary";

export default function Responses(props) {
  const { questionnaireId } = props;
  const theme = useTheme();
  const data = props.data;
  const hasData = () => data && !isEmptyArray(data.responseData);
  const Root = styled("div")(({ theme }) => ({
    [theme.breakpoints.up("md")]: { minWidth: "600px" },
  }));

  const renderPrintOnlyResponseTable = () => {
    if (!hasData()) return null;
    const rowData = data?.printResponseData;
    if (!rowData) return null;
    const headerRow = rowData.headerRow;
    const bodyRows = rowData.bodyRows;
    const scoreRow = rowData.scoreRow;

    return (
      <Box className="print-only responses-table-container" sx={{ marginTop: theme.spacing(2) }}>
        <Table aria-label="responses table" size="small" role="table" sx={{ tableLayout: "fixed", width: "100%" }}>
          <TableHead sx={{ backgroundColor: theme?.palette?.dark ? theme?.palette?.dark?.main : "#444" }}>
            <TableRow>
              {headerRow.map((item, index) => (
                <TableCell key={`header_${index}`}>{item}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {bodyRows.map((row, index) => (
              <TableRow key={`row_content_${row.id}_${index}`}>
                {row.map((cell, index) => {
                  if (index === 0) {
                    return (
                      <TableCell
                        dangerouslySetInnerHTML={{ __html: cell }}
                        key={`question_cell_${index}`}
                        size="small"
                      />
                    );
                  }
                  return (
                    <TableCell key={`answer_cell_${index}`} size="small">
                      {cell}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {scoreRow && (
              <TableRow>
                <TableCell>
                  <b>Score</b>
                </TableCell>
                {scoreRow.map((item, index) => (
                  <TableCell key={`score_cell_${index}`}>
                    {isNumber(item.score) ? (
                      <Score
                        instrumentId={questionnaireId}
                        score={item.score}
                        scoreParams={{ ...item, ...(item.scoringParams ?? {}) }}
                      />
                    ) : (
                      <span>N/A</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    );
  };
  return (
    <Root>
      <ScoringSummary
        key={`responsesTable_${questionnaireId}`}
        data={data?.scoringSummaryData ? [data?.scoringSummaryData] : []}
        disableLinks={true}
        enableResponsesViewer={true}
        hiddenColumns={["id", "source", "numAnswered", "meaning", "comparison"]}
      ></ScoringSummary>
      {renderPrintOnlyResponseTable()}
    </Root>
  );
}

const dataShape = PropTypes.shape({
  scoringSummaryData: PropTypes.object,
  responseData: PropTypes.array,
  printResponseData: PropTypes.shape({
    headerRow: PropTypes.array,
    bodyRows: PropTypes.array,
    scoreRow: PropTypes.array
  }),
});

Responses.propTypes = {
  questionnaireId: PropTypes.string,
  questionnaireJson: PropTypes.object,
  data: dataShape,
};
