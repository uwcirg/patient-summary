import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  instrumentName: "HIV Stigma",
  title: "HIV Stigma",
  alertQuestionId: "HIV-STIGMA-SCORE-CRITICAL",
  scoringQuestionId: "HIV-STIGMA-SCORE",
  showNumAnsweredWithScore: true,
  totalAnsweredQuestionId: "HIV-STIGMA-SCORE-NUM-ANSWERED",
  valueFormatter: (val, params) => {
    if (params && params.context === "score") return val;
    const mappings = {
      1: "Strongly disagree",
      2: "Disagree",
      3: "Neither disagree nor agree",
      4: "Agree",
      5: "Strongly agree"
    };
    return mappings[val] || val;
  },
  noteFunction: (questionnaire) => {
    if (!questionnaire) return "";
    const matchedItem = questionnaire.item.find((o) => o.linkId === "HIV-STIGMA-SCORE");
    return matchedItem?.text;
  },
  severityBands: [
    { min: 4, label: "high", meaning: "Stigma Suggested" },
    { min: 0, label: "low", meaning: "" },
  ],
  highSeverityScoreCutoff: 4,
  chartParams: { ...CHART_CONFIG.default, title: "HIV Stigma Score", xLabel: "" },
};
