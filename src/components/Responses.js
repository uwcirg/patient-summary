import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `tab-${index}`,
    "aria-controls": `tabpanel-${index}`,
  };
}

export default function Responses(props) {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };
  const data = props.data || [];

  const getAnswer = (response) => {
    if (!response) return "--";
    return response.value &&
      (parseInt(response.value.value) === 0 ||
        response.value.value)
      ? response.value.value
      : (response.answer ? response.answer : "---");
  };
  const getQuestion = (item) => {
    return item.question || item.text || item.id;
  };
  const hasData = () => data && data.length > 0;
  const hasResponses = (responses) => responses && Array.isArray(responses) && responses.length > 0;

  const Root = styled("div")(({ theme }) => ({
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "45%",
    },
    paddingTop: "16px"
  }));

  const renderTitle = () => (
    <Typography
      variant="subtitle1"
      gutterBottom
      component="h2"
      color="secondary"
    >
      Questionnaire Responses
    </Typography>
  );

  const renderTabs = () => (
    <Box>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="responses tabs"
      >
        {data.map((item, index) => (
          <Tab
            label={item.date}
            {...a11yProps(index)}
            key={`tabLabel_${index}`}
          />
        ))}
      </Tabs>
    </Box>
  );

  const renderResponseTable = (responses) => (
    <Table aria-label="responses table" size="small" role="table">
      <TableHead
        sx={{
          backgroundColor:
            theme && theme.palette.dark ? theme.palette.dark.main : "#444",
        }}
      >
        <TableRow>
          {["Question", "Answer"].map((item, index) => (
            <TableCell
              key={`header_${index}`}
              sx={{ color: "#FFF", width: "50%" }}
            >
              {item}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {responses.map((row, index) => (
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
            ></TableCell>
            <TableCell
              dangerouslySetInnerHTML={{
                __html: getAnswer(row),
              }}
            ></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      {!hasData() && <Alert severity="warning">No recorded response</Alert>}
      {hasData() && (
        <Root>
          {renderTitle()}
          {renderTabs()}
          {data.map((item, index) => (
            <TabPanel value={tab} index={index} key={`tabPanel_${index}`}>
              <TableContainer
                component={Paper}
                sx={{ marginTop: theme.spacing(2) }}
              >
                {!hasResponses(item.responses) && (
                  <Alert severity="warning">No responses.</Alert>
                )}
                {hasResponses(item.responses) && renderResponseTable(item.responses)}
              </TableContainer>
            </TabPanel>
          ))}
        </Root>
      )}
    </>
  );
}
Responses.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      responses: PropTypes.array,
    })
  ),
};
