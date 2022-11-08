import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Link from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import Scoring from "./Score";
import qConfig from "../config/questionnaire_config";
import { instrumentNameMaps } from "../consts/consts";
import {
  scrollToAnchor
} from "../util/util";


export default function ScoringSummary(props) {
  const theme = useTheme();
  const { summaryData, loadComplete } = props;
  const hasList = () => loadComplete && Object.keys(summaryData).length > 0;
  const getSortedResponses = (rdata) => {
    if (!rdata || rdata.length === 0) return [];
    return rdata.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  const getInstrumentShortName = (id) =>
    instrumentNameMaps[id] ? instrumentNameMaps[id] : String(id).toUpperCase();

  const getPrevScoreByInstrument = (rdata) => {
    const responses = getSortedResponses(rdata);
    if (!responses || !responses.length || responses.length === 1) return parseInt(null);
    return parseInt(responses[1].score);
  };

  const getCurrentScoreByInstrument = (rdata) => {
    const sortedResponses = getSortedResponses(rdata);
    if (!sortedResponses || !sortedResponses.length) return parseInt(null);
    return parseInt(sortedResponses[0].score);
  };
  const getDisplayIcon = (id, rdata) => {
    const comparisonToAlert = qConfig[id].comparisonToAlert;
    const currentScore = getCurrentScoreByInstrument(rdata);
    const prevScore = getPrevScoreByInstrument(rdata);
    console.log("current score ", currentScore, " prev score ", prevScore)
    if (isNaN(prevScore) || isNaN(currentScore)) return "--";
    if (!isNaN(prevScore)) {
      if (comparisonToAlert === "low") {
        if (currentScore < prevScore)
          return <SouthIcon color="error"></SouthIcon>;
        if (currentScore > prevScore)
          return <NorthIcon color="success"></NorthIcon>;
        return <HorizontalRuleIcon></HorizontalRuleIcon>;
      } else {
        if (currentScore > prevScore)
          return <NorthIcon color="error"></NorthIcon>;
        if (currentScore < prevScore)
          return <SouthIcon color="success"></SouthIcon>;
        return <HorizontalRuleIcon></HorizontalRuleIcon>;
      }
    } else {
      if (!isNaN(currentScore))
        return <HorizontalRuleIcon color="info"></HorizontalRuleIcon>;
      return null;
    }
  };
  const handleClick = (e, anchorElementId) => {
    e.preventDefault();
    scrollToAnchor(anchorElementId);
  };
  const renderTitle = () => (
    <Typography
      variant="h6"
      component="h3"
      color="accent"
      sx={{ padding: 1, marginLeft: 1, marginTop: 1, marginBottom: 1 }}
    >
      Scoring Summary
    </Typography>
  );

  const renderSummary = () =>
    hasList() && (
      <TableContainer sx={{ padding: 2, paddingTop: 0, marginBottom: 1 }}>
        <Table
          sx={{ border: "1px solid #ececec" }}
          size="small"
          aria-label="scoring summary table"
        >
          <TableHead>
            <TableRow>
              <TableCell size="small"></TableCell>
              <TableCell variant="body" size="small">
                Score
              </TableCell>
              <TableCell variant="body" size="small">
                Compared to Last
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(summaryData).map((key, index) => (
              <TableRow key={`{summary_${index}}`}>
                <TableCell sx={{ fontWeight: 500 }} size="small">
                  <Link
                    onClick={(e) => handleClick(e, key)}
                    underline="none"
                    sx={{ color: theme.palette.link.main, cursor: "pointer" }}
                  >
                    {getInstrumentShortName(key)}
                  </Link>
                </TableCell>
                <TableCell align="left" size="small">
                  <Scoring
                    instrumentId={key}
                    score={getCurrentScoreByInstrument(
                      summaryData[key].responses
                    )}
                    justifyContent="space-between"
                  ></Scoring>
                </TableCell>
                <TableCell align="center" size="small">
                  {getDisplayIcon(key, summaryData[key].responses)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  return (
    <Paper sx={{ minWidth: "55%" }}>
      {renderTitle()}
      {renderSummary()}
    </Paper>
  );
}

ScoringSummary.propTypes = {
  summaryData: PropTypes.object,
};
