import { PHQ9_ADMIN_NOTE } from "@consts";
import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";
import { PHQ9_SI_QUESTION_LINK_ID, PHQ9_SI_ANSWER_SCORE_MAPPINGS } from "@/consts";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-PHQ9",
  questionnaireName: "phq9",
  instrumentName: "Patient Health Questionnaire-9 (PHQ-9)",
  title: "PHQ-9",
  subtitle: "Last two weeks",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/phq9",
  scoringQuestionId: "/44261-6",
  note: PHQ9_ADMIN_NOTE,
  subScoringQuestions: [{ key: "PHQ-2", linkId: "/55758-7" }],
  maximumScore: 27,
  linkIdMatchMode: "fuzzy",
  questionLinkIds: [
    "/55758-7",
    "/44250-9",
    "/44255-8",
    "/44259-0",
    "/44254-1",
    "/44251-7",
    "/44258-2",
    "/44252-5",
    "/44253-3",
    "/44260-8",
  ],
  itemTextByLinkId: {
    "/55758-7": "PHQ-2 total score",
    "/44261-6": "PHQ-9 total score",
  },
  highSeverityScoreCutoff: 20,
  mediumSeverityScoreCutoff: 10,
  severityBands: [
    { min: 20, label: "high", meaning: "Severe depression" },
    { min: 15, label: "moderately high", meaning: "Moderately severe depression" },
    { min: 10, label: "moderate", meaning: "Moderate depression" },
    { min: 5, label: "mild", meaning: "Mild depression" },
    { min: 0, label: "low", meaning: "Minimal depression" },
  ],
  showNumAnsweredWithScore: true,
  chartParams: {
    ...CHART_CONFIG.default,
    title: "PHQ-9 Score",
    minimumYValue: 0,
    maximumYValue: 27,
    xLabel: "",
    connectNulls: true,
    dotColor: null,
    splitBySource: true,
  },
};

export const CIRG_SI = {
  ...BASE_CONFIG,
  instrumentName: "Suicide Ideation",
  title: "Suicide Ideation",
  subtitle: "Last two weeks",
  scoringQuestionId: PHQ9_SI_QUESTION_LINK_ID,
  fallbackScoreMap: PHQ9_SI_ANSWER_SCORE_MAPPINGS,
  highSeverityScoreCutoff: 3,
  mediumSeverityScoreCutoff: 2,
  comparisonToAlert: "higher",
  severityBands: [
    { min: 3, label: "high", meaning: "Nearly every day" },
    { min: 2, label: "moderate", meaning: "More than half the days" },
    { min: 1, label: "mild", meaning: "Several days" },
    { min: 0, label: "low", meaning: "Not at all" },
  ],
  minimumScore: 0,
  maximumScore: 3,
  deriveFrom: {
    hostIds: ["CIRG-PHQ9"],
    linkId: PHQ9_SI_QUESTION_LINK_ID,
  },
  chartParams: {
    ...CHART_CONFIG.default,
    title: "Suicide Ideation",
    minimumYValue: 0,
    maximumYValue: 3,
    xLabel: "",
    yLabel: "value",
    type: "barchart",
    dotColor: null,
  },
};
