import React, { forwardRef, useState } from "react";
import { styled, useTheme } from "@mui/material/styles";
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
import Paper from "@mui/material/Paper";
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
import TableRowsIcon from "@mui/icons-material/TableRows";
import { getLocaleDateStringFromDate, isEmptyArray, isNumber } from "@util";
import Questionnaire from "@models/Questionnaire";
import Score from "./Score";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function Responses(props) {
  const { questionnaireId, questionnaireJson } = props;
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const headerBgColor =
    theme && theme.palette && theme.palette.lightest && theme.palette.lightest.main
      ? theme.palette.lightest.main
      : "#FFF";
  const questionnaireTitle = new Questionnaire(questionnaireJson).displayName;
  const data = props.data;
  const responseData = data?.responseData;
  const dates = data?.responseData?.map((item) => ({ date: item.date, id: item.id })) ?? [];
  const lighterThemeMainColor = theme && theme.palette && theme.palette.lighter && theme.palette.lighter.main;
  const summaryHeaderProps = {
    variant: "subtitle2",
    component: "h2",
    color: "secondary",
    sx: {
      width: "100%",
      textAlign: "left",
      whiteSpace: "nowrap",
    },
  };
  const summaryColumnProps = {
    direction: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    sx: {
      alignSelf: "stretch",
      flex: 1,
      whiteSpace: "nowrap",
      width: "100%",
      border: `1px solid ${lighterThemeMainColor ? lighterThemeMainColor : "#ececec"}`,
      "&:first-of-type": {
        borderRight: 0,
      },
      "&:last-of-type": {
        borderLeft: 0,
      },
    },
  };
  const columns = [
    {
      title: "Questions",
      field: "question",
      // hiddenByColumnsButton: false,
      filtering: false,
      cellStyle: {
        position: "sticky",
        left: 0,
        backgroundColor: "#FFF",
        borderRight: "1px solid #ececec",
        minWidth: "200px",
      },
      render: (rowData) => {
        if (String(rowData["question"]).toLowerCase() === "score") return <b>{rowData["question"]}</b>;
        else return <span dangerouslySetInnerHTML={{ __html: rowData["question"] }}></span>;
      },
    },
    ...dates.map((item) => ({
      id: `date_${item.id}`,
      title: getLocaleDateStringFromDate(item.date),
      field: item.id,
      cellStyle: {
        minWidth: "148px",
        borderRight: "1px solid #ececec",
      },
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
        const rowDataItem = rowData[item.id];
        if (!rowDataItem) return;
        if (isNumber(rowDataItem.score)) {
          return <Score instrumentId={questionnaireId} score={rowDataItem.score} scoreParams={rowDataItem}></Score>;
        } else return typeof rowDataItem === "string" ? rowDataItem : "--";
      },
    })),
  ];

  const getLastAssessedDateTime = () => (!isEmptyArray(dates) ? getLocaleDateStringFromDate(dates[0].date) : "--");
  const hasData = () => data && !isEmptyArray(data.responseData);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const renderPrintOnlyResponseTable = () => {
    if (!hasData()) return null;
    const rowData = data?.printResponseData;
    if (!rowData) return null;
    const headerRow = rowData.headerRow;
    const bodyRows = rowData.bodyRows;
    const scoreRow = rowData.scoreRow;
    // this will render the current and the previous response(s) for print
    return (
      <Box className="print-only responses-table-container" sx={{ marginTop: theme.spacing(2) }}>
        <Table aria-label="responses table" size="small" role="table" sx={{ tableLayout: "fixed", width: "100%" }}>
          <TableHead
            sx={{
              backgroundColor: theme && theme.palette.dark ? theme.palette.dark.main : "#444",
            }}
          >
            <TableRow>
              {headerRow.map((item, index) => {
                return <TableCell key={`header_${index}`}>{item}</TableCell>;
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {bodyRows.map((row, index) => (
              <TableRow
                key={`row_content_${index}`}
                id={`row_content_${index}`}
              >
                {row.map((cell, index) => {
                  if (index === 0) {
                    return (
                      <TableCell
                        dangerouslySetInnerHTML={{
                          __html: cell,
                        }}
                        key={`question_cell_${index}`}
                        size="small"
                      ></TableCell>
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
                    {isNumber(item.score) && (
                      <Score instrumentId={questionnaireId} score={item.score} scoreParams={item.scoreParams}></Score>
                    )}
                    {!isNumber(item.score) && <span>--</span>}
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
      className="responses-container"
      sx={{
        borderRadius: 0,
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
        position: "relative",
      }}
    >
      <MaterialTable
        components={{
          Container: (props) => <Paper className="table-root" elevation={1} {...props} />,
        }}
        columns={columns}
        //data={getData()}
        data={data?.tableResponseData}
        options={{
          search: false,
          showTitle: false,
          padding: "dense",
          toolbar: false,
          paging: false,
          thirdSortClick: false,
          headerStyle: {
            backgroundColor: headerBgColor,
            position: "sticky",
            top: 0,
            zIndex: 998,
            borderRight: "1px solid #ececec",
          },
          rowStyle: (rowData) => ({
            backgroundColor: rowData.tableData.index % 2 === 0 ? "#f4f4f6" : "#fff",
          }),
        }}
      ></MaterialTable>
    </Box>
  );

  const renderNumberOfResponses = () => (
    <Stack {...summaryColumnProps}>
      <SummaryHeaderCell>
        <Typography {...summaryHeaderProps}>Responses Completed</Typography>
      </SummaryHeaderCell>
      <SummaryBodyCell>{responseData.length}</SummaryBodyCell>
    </Stack>
  );

  const renderLastAssessed = () => (
    <Stack {...summaryColumnProps}>
      <SummaryHeaderCell>
        <Typography {...summaryHeaderProps}>Last answered on</Typography>
      </SummaryHeaderCell>
      <SummaryBodyCell>{getLastAssessedDateTime()}</SummaryBodyCell>
    </Stack>
  );

  const renderViewResponses = () => (
    <Stack {...summaryColumnProps} className="print-hidden">
      <SummaryHeaderCell>
        <Typography {...summaryHeaderProps}>Responses</Typography>
      </SummaryHeaderCell>
      <SummaryBodyCell>
        <Button
          color="primary"
          title="View"
          size="small"
          endIcon={<TableRowsIcon fontSize="medium"></TableRowsIcon>}
          onClick={() => handleClickOpen()}
        >
          View
        </Button>
      </SummaryBodyCell>
    </Stack>
  );

  const Root = styled("div")(({ theme }) => ({
    [theme.breakpoints.up("md")]: {
      minWidth: "600px",
    },
  }));

  const SummaryHeaderCell = styled("div")(({ theme }) => ({
    borderBottom: `1px solid ${lighterThemeMainColor ? lighterThemeMainColor : "#ececec"}`,
    backgroundColor:
      theme && theme.palette && theme.palette.lightest && theme.palette.lightest.main
        ? theme.palette.lightest.main
        : "#FFF",
    padding: theme.spacing(1, 2),
    width: "100%",
  }));
  const SummaryBodyCell = styled("div")(({ theme }) => ({
    padding: theme.spacing(1, 2),
    width: "100%",
    textAlign: "left",
  }));

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
      <AppBar sx={{ position: "relative", minHeight: "48px" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {questionnaireTitle}
          </Typography>
          <Button color="inherit" onClick={handleClose}>
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
          <Stack direction="row" alignItems="center" spacing={0}>
            {renderNumberOfResponses()}
            {renderLastAssessed()}
            {renderViewResponses()}
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
  data: PropTypes.object,
};
