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
  fallbackScoreMap: {
    "HIV-STIGMA-0-0": "Strongly disagree",
    "HIV-STIGMA-0-1": "Disagree",
    "HIV-STIGMA-0-2": "Neither disagree nor agree",
    "HIV-STIGMA-0-3": "Agree",
    "HIV-STIGMA-0-4": "Strongly agree",
    "HIV-STIGMA-1-0": "Strongly disagree",
    "HIV-STIGMA-1-1": "Disagree",
    "HIV-STIGMA-1-2": "Neither disagree nor agree",
    "HIV-STIGMA-1-3": "Agree",
    "HIV-STIGMA-1-4": "Strongly agree",
    "HIV-STIGMA-2-0": "Strongly disagree",
    "HIV-STIGMA-2-1": "Disagree",
    "HIV-STIGMA-2-2": "Neither disagree nor agree",
    "HIV-STIGMA-2-3": "Agree",
    "HIV-STIGMA-2-4": "Strongly agree",
    "HIV-STIGMA-3-0": "Strongly disagree",
    "HIV-STIGMA-3-1": "Disagree",
    "HIV-STIGMA-3-2": "Neither disagree nor agree",
    "HIV-STIGMA-3-3": "Agree",
    "HIV-STIGMA-3-4": "Strongly agree", 
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
