import React from "react";
import { styled, useTheme } from "@mui/material/styles";
import PropTypes from "prop-types";
//import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
//import Button from "@mui/material/Button";
//import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
//import Typography from "@mui/material/Typography";
//import { getLocaleDateStringFromDate, isEmptyArray, isNumber } from "@util";
import { isEmptyArray, isNumber } from "@util";
//import Questionnaire from "@models/Questionnaire";
import Score from "./Score";
import ScoringSummary from "./sections/ScoringSummary";
//import ResponsesViewer from "./ResponsesViewer";

export default function Responses(props) {
  // const { questionnaireId, questionnaireJson } = props;
  const { questionnaireId } = props;
  const theme = useTheme();

  //const headerBgColor = theme?.palette?.lightest?.main ?? "#FFF";

  //const questionnaireTitle = new Questionnaire(questionnaireJson).displayName;
  const data = props.data;
  console.log("responses data ", data);
  //const responseData = data?.responseData;

  //const dates = data?.responseData?.map((item) => ({ date: item.date, id: item.id })) ?? [];
  //const lighterThemeMainColor = theme?.palette?.lighter?.main;

  // const summaryHeaderProps = {
  //   variant: "subtitle2",
  //   component: "h2",
  //   color: "secondary",
  //   sx: { width: "100%", textAlign: "left", whiteSpace: "nowrap" },
  // };

  // const summaryColumnProps = {
  //   direction: "column",
  //   justifyContent: "flex-start",
  //   alignItems: "center",
  //   sx: {
  //     alignSelf: "stretch",
  //     flex: 1,
  //     whiteSpace: "nowrap",
  //     width: "100%",
  //     border: `1px solid ${lighterThemeMainColor ?? "#ececec"}`,
  //     "&:first-of-type": { borderRight: 0 },
  //     "&:last-of-type": { borderLeft: 0 },
  //   },
  // };

  const hasData = () => data && !isEmptyArray(data.responseData);

  // const getLastAssessedDateTime = () => (!isEmptyArray(dates) ? getLocaleDateStringFromDate(dates[0].date) : "--");
  // const getMostRecentScore = () => (!isEmptyArray(responseData) ? responseData[0].score : null);
  // const getMostRecentScoreParams = () => (!isEmptyArray(responseData) ? responseData[0].scoringParams : null);

  const Root = styled("div")(({ theme }) => ({
    [theme.breakpoints.up("md")]: { minWidth: "600px" },
  }));

  // const SummaryHeaderCell = styled("div")(({ theme }) => ({
  //   borderBottom: `1px solid ${lighterThemeMainColor ?? "#ececec"}`,
  //   backgroundColor: theme?.palette?.lightest?.main ?? "#FFF",
  //   padding: theme.spacing(1, 2),
  //   width: "100%",
  // }));
  // const SummaryBodyCell = styled("div")(({ theme }) => ({
  //   padding: theme.spacing(1, 2),
  //   width: "100%",
  //   textAlign: "left",
  // }));

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
          <TableHead sx={{ backgroundColor: theme?.palette?.dark ? theme.palette.dark.main : "#444" }}>
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
                      <Score instrumentId={questionnaireId} score={item.score} scoreParams={item.scoreParams} />
                    ) : (
                      <span>--</span>
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

  // const renderScore = () => (
  //   <Stack {...summaryColumnProps}>
  //     <SummaryHeaderCell>
  //       <Typography {...summaryHeaderProps}>Score/Result</Typography>
  //     </SummaryHeaderCell>
  //     <SummaryBodyCell>
  //       <Score score={getMostRecentScore()} scoreParams={getMostRecentScoreParams()} justifyContent="space-between" />
  //     </SummaryBodyCell>
  //   </Stack>
  // );

  // const renderLastAssessed = () => (
  //   <Stack {...summaryColumnProps}>
  //     <SummaryHeaderCell>
  //       <Typography {...summaryHeaderProps}>Most Recent Pro Date</Typography>
  //     </SummaryHeaderCell>
  //     <SummaryBodyCell>{getLastAssessedDateTime()}</SummaryBodyCell>
  //   </Stack>
  // );

  return (
    // <>
    //   {!hasData() && <Alert severity="warning">No recorded response</Alert>}
    //   {hasData() && (
    //     <Root>
    //       <Stack direction="row" alignItems="center" spacing={0}>
    //         {renderScore()}
    //         {renderLastAssessed()}

    //         <ResponsesViewer
    //           title={questionnaireTitle}
    //           tableData={data?.tableResponseData}
    //           headerBgColor={headerBgColor}
    //         />
    //       </Stack>

    //       {renderPrintOnlyResponseTable()}
    //     </Root>
    //   )}
    // </>
    <Root>
      {/* <Stack direction="row" alignItems="center" spacing={0}>
            {renderScore()}
            {renderLastAssessed()}

            <ResponsesViewer
              title={questionnaireTitle}
              tableData={data?.tableResponseData}
              headerBgColor={headerBgColor}
            />
          </Stack> */}
      <ScoringSummary
        key={`responsesTable_${questionnaireId}`}
        scoringSummaryData={data?.scoringSummaryData ? [data.scoringSummaryData] : null}
        disableLinks={true}
        enableResponsesViewer={true}
        hiddenColumns={["id", "source", "numAnswered", "meaning", "comparison"]}
      ></ScoringSummary>

      {renderPrintOnlyResponseTable()}
    </Root>
  );
}

Responses.propTypes = {
  questionnaireId: PropTypes.string,
  questionnaireJson: PropTypes.object,
  data: PropTypes.object,
};
