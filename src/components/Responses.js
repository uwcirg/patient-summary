import { forwardRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import MaterialTable from "@material-table/core";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import Slide from "@mui/material/Slide";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import Filter from "@mui/icons-material/FilterAlt";
import OutlinedIcon from "@mui/icons-material/WysiwygOutlined";
import ListAltIcon from "@mui/icons-material/ListAlt";
import Score from "./Score";
import {
  getLocaleDateStringFromDate,
  getQuestionnaireName,
} from "../util/util";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function Responses(props) {
  const { questionnaireId, questionnaireJson } = props;
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const headerBgColor =
    theme &&
    theme.palette &&
    theme.palette.lightest &&
    theme.palette.lightest.main
      ? theme.palette.lightest.main
      : "#FFF";
  const getFormattedData = (data) => {
    if (!data || !data.length) return null;
    let copyData = JSON.parse(JSON.stringify(data));
    const maxResponsesLength = Math.max(
      ...copyData.map((d) => (d.responses ? d.responses.length : 0))
    );
    const dataForQuestions = copyData.find(
      (d) => d.responses && d.responses.length === maxResponsesLength
    );
    if (!dataForQuestions) return null;
    copyData.forEach((d) => {
      if (d.id === dataForQuestions.id) return true;
      if (!d.responses || !d.responses.length) return true;
      dataForQuestions.responses.forEach((item) => {
        const matched = d.responses.find((o) => o.id === item.id);
        if (!matched) {
          d.responses.push({
            id: item.id,
            question: item.question,
            answer: "",
          });
        }
      });
    });
    return copyData;
  };
  const data = getFormattedData(props.data) || [];
  const dates = data.map((item) => ({ date: item.date, id: item.id }));
  const columns = [
    {
      title: "Questions",
      field: "question",
      hiddenByColumnsButton: true,
      filtering: false,
      cellStyle: {
        position: "sticky",
        left: 0,
      },
      render: (rowData) => {
        if (String(rowData["question"]).toLowerCase() === "score")
          return <b>{rowData["question"]}</b>;
        else return rowData["question"];
      },
    },
    ...dates.map((item) => ({
      title: getLocaleDateStringFromDate(item.date),
      field: item.id,
      filterComponent: ({ columnDef, onFilterChanged }) => (
        <Input
          className="print-hidden"
          placeholder="Filter"
          startAdornment={
            <InputAdornment position="start">
              <Filter />
            </InputAdornment>
          }
          onChange={(e) => {
            // Calling the onFilterChanged with the current tableId and the new value
            onFilterChanged(columnDef.tableData.id, e.target.value);
          }}
        />
      ),
      render: (rowData) => {
        if (rowData[item.id].hasOwnProperty("score")) {
          if (!isNaN(rowData[item.id].score)) {
            return (
              <Score
                instrumentId={questionnaireId}
                score={rowData[item.id].score}
                scoreParams={rowData[item.id]}
              ></Score>
            );
          } else return "--";
        }
        return rowData[item.id];
      },
    })),
  ];

  const hasData = () =>
    data &&
    data.length > 0 &&
    data.filter((item) => item.responses && item.responses.length).length > 0;
  const hasScores = () =>
    data.filter((item) => item.hasOwnProperty("score") && !isNaN(item.score))
      .length > 0;

  const getData = () => {
    if (!hasData()) return null;
    let result = data[0].responses.map((row, index) => {
      let o = {};
      o.question = getQuestion(row);
      dates.forEach((item) => {
        o[item.id] = getMatchedAnswerByLinkIdDateId(row.id, item.date, item.id);
      });
      return o;
    });
    if (hasScores()) {
      let scoringResult = {
        question: "Score",
      };
      data.forEach(
        (item) => (scoringResult[item.id] = { score: item.score, ...item })
      );
      result.push(scoringResult);
    }
    console.log("result ", result);
    return result;
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const getAnswer = (response) => {
    if (!response) return "--";
    return response.value &&
      (parseInt(response.value.value) === 0 || response.value.value)
      ? response.value.value
      : response.answer
      ? String(response.answer)
      : "---";
  };
  const getQuestion = (item) => {
    return item.question || item.text || item.id;
  };

  const getMatchedAnswerByLinkIdDateId = (
    question_linkId,
    responses_date,
    responses_id
  ) => {
    const matchItem = data.filter(
      (item) => item.id === responses_id && item.date === responses_date
    );
    if (!matchItem.length) return "--";
    const responses = matchItem[0].responses;
    const answerItem = responses.filter((o) => o.id === question_linkId);
    if (!answerItem.length) return "--";
    return getAnswer(answerItem[0]);
  };

  const Root = styled("div")(({ theme }) => ({
    width: "100%",
    paddingTop: theme.spacing(1),
  }));

  const renderTitle = () => (
    <Typography variant="subtitle1" component="h2" color="secondary">
      Questionnaire Responses
    </Typography>
  );

  const renderPrintOnlyResponseTable = () => {
    if (!hasData()) return null;
    const arrDates = dates.filter((item, index) => index < 2);
    const arrData = data.filter((item, index) => index < 2);
    console.log("data ? ", data);
    // this will render the current and the previous response(s) for print
    return (
      <Box className="print-only">
        <Table
          aria-label="responses table"
          size="small"
          role="table"
          sx={{ tableLayout: "fixed", width: "100%" }}
        >
          <TableHead
            sx={{
              backgroundColor:
                theme && theme.palette.dark ? theme.palette.dark.main : "#444",
            }}
          >
            <TableRow>
              {["Questions", ...arrDates.map((item) => item.date)].map(
                (item, index) => (
                  <TableCell key={`header_${index}`}>
                    {getLocaleDateStringFromDate(item)}
                  </TableCell>
                )
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data[0].responses.map((row, index) => (
              <TableRow
                key={`row_content_${index}`}
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                }}
              >
                <TableCell
                  dangerouslySetInnerHTML={{
                    __html: getQuestion(row),
                  }}
                  size="small"
                ></TableCell>
                {arrDates.map((item, index) => (
                  <TableCell key={`answer_cell_${index}`} size="small">
                    {getMatchedAnswerByLinkIdDateId(row.id, item.date, item.id)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {hasScores() && (
              <TableRow>
                <TableCell>
                  <b>Score</b>
                </TableCell>
                {arrData.map((item, index) => (
                  <TableCell key={`score_cell_${index}`}>
                    {!isNaN(item.score) && (
                      <Score
                        instrumentId={questionnaireId}
                        score={item.score}
                        scoreParams={item}
                      ></Score>
                    )}
                    {isNaN(item.score) && <span>--</span>}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderResponseTable = () => (
    <Box
      sx={{
        borderRadius: 0,
        marginTop: theme.spacing(2),
        marginLeft: "auto",
        marginRight: "auto",
        padding: theme.spacing(2),
        width: "100%",
        [theme.breakpoints.up("md")]: {
          width: "95%",
        },
        [theme.breakpoints.up("lg")]: {
          width: "80%",
        },
        overflowX: "auto",
      }}
    >
      <MaterialTable
        columns={columns}
        data={getData()}
        icons={{
          ViewColumn: forwardRef((props, ref) => (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ListAltIcon />}
              {...props}
              ref={ref}
              className="print-hidden"
            >
              +/- Columns
            </Button>
          )),
        }}
        options={{
          search: false,
          showTitle: false,
          padding: "dense",
          columnsButton: true,
          filtering: true,
          paging: false,
          thirdSortClick: false,
          filterCellStyle: {
            padding: theme.spacing(1),
            borderRadius: 0,
          },
          headerStyle: {
            backgroundColor: headerBgColor,
          },
          rowStyle: (rowData) => ({
            backgroundColor:
              rowData.tableData.index % 2 === 0 ? "#f4f4f6" : "#fff",
          }),
        }}
      ></MaterialTable>
    </Box>
  );

  const renderOpenIcon = () => (
    <IconButton
      color="primary"
      title="View"
      size="small"
      className="print-hidden"
    >
      <OutlinedIcon fontSize="medium"></OutlinedIcon>
    </IconButton>
  );

  const renderDialog = () => (
    <Dialog
      fullScreen
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      transitionDuration={{
        enter: 500,
        exit: 500,
      }}
    >
      <AppBar sx={{ position: "relative" }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Questionnaire Responses for{" "}
            {getQuestionnaireName(questionnaireJson)}
          </Typography>
          <Button autoFocus color="inherit" onClick={handleClose}>
            Close
          </Button>
        </Toolbar>
      </AppBar>
      {renderResponseTable()}
    </Dialog>
  );

  return (
    <>
      {!hasData() && <Alert severity="warning">No recorded response</Alert>}
      {hasData() && (
        <Root>
          <Stack
            direction="row"
            onClick={() => handleClickOpen()}
            alignItems="center"
            spacing={1}
          >
            {renderTitle()}
            <div className="print-hidden">( {data.length} )</div>
            {renderOpenIcon()}
          </Stack>
          {renderDialog()}
          {renderPrintOnlyResponseTable()}
        </Root>
      )}
    </>
  );
}
Responses.propTypes = {
  questionnaireId: PropTypes.string,
  questionnaireJson: PropTypes.object,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      responses: PropTypes.array,
    })
  ),
};
