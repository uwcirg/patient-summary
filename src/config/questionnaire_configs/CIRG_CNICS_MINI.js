import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  instrumentName: "MINI Score",
  title: "MINI Score",
  subtitle: "Past 12 months",
  minimumScore: 0,
  maximumScore: 7,
  scoringQuestionId: "MINI-score",
  meaningQuestionId: "MINI-score-interpretation",
  excludeQuestionLinkIdPatterns: ["MINI-score-ignoring-skipped"],
  chartParams: {
    ...CHART_CONFIG.default,
    title: "MINI Score",
    minimumYValue: 0,
    maximumYValue: 7,
    xLabel: "",
  },
};
