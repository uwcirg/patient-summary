import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";
import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";

export default {
  ...BASE_CONFIG,
  title: "Alcohol Score",
  subtitle: "Past 12 months",
  instrumentName: "CNICS AUDIT (alcohol consumption questions)",
  minimumScore: 0,
  maximumScore: 38,
  scoringQuestionId: "AUDIT-score",
  subScoringQuestions: [
    { key: "AUDIT-C-score", linkId: "AUDIT-C-score" },
    { key: "AUDIT-score", linkId: "AUDIT-score" },
  ],
  displayMeaningNotScore: true,
  fallbackMeaningFunc: function (severity, responses) {
    if (isEmptyArray(responses)) return "";
    let arrMeaning = [];
    const scoreToReportResponse = responses.find((response) =>
      linkIdEquals(response.id, "AUDIT-qnr-to-report", "strict"),
    );
    const scoreToReport = scoreToReportResponse ? scoreToReportResponse.answer : null;
    const interpretationResponse = responses.find((response) =>
      linkIdEquals(
        response.id,
        scoreToReport === "AUDIT-C" ? "AUDIT-C-score-interpretation" : "AUDIT-score-interpretation",
        "strict",
      ),
    );
    const interpretation = interpretationResponse ? interpretationResponse.answer : null;
    const auditCResponse = responses.find((response) => linkIdEquals(response.id, "AUDIT-C-score", "strict"));
    const auditCScore = auditCResponse ? parseInt(auditCResponse.answer, 10) : null;
    const auditResponse = responses.find((response) => linkIdEquals(response.id, "AUDIT-score", "strict"));
    const auditScore = auditResponse ? parseInt(auditResponse.answer, 10) : null;
    if (scoreToReport === "AUDIT-C" && auditCScore != null) {
      arrMeaning.push(auditCScore + " (AUDIT-C)");
    } else if (scoreToReport === "AUDIT" && auditScore != null) {
      arrMeaning.push(auditScore + " (AUDIT)");
    }
    if (!isEmptyArray(arrMeaning) && interpretation) {
      arrMeaning.push(interpretation);
    }
    return arrMeaning.join("|");
  },
  chartParams: {
    ...CHART_CONFIG.default,
    title: "Alcohol Score",
    minimumYValue: 0,
    maximumYValue: 38,
    xLabel: "",
    scoringQuestionId: "AUDIT-score",
    yLineFields: [
      { key: "AUDIT-C-score", color: "#498C8A", strokeWidth: 1, legendType: "line", strokeOpacity: 0.6 },
      { key: "AUDIT-score", color: "#600876", strokeWidth: 1, strokeOpacity: 0.6, legendType: "line" },
    ],
    showTooltipMeaning: false,
  },
};
