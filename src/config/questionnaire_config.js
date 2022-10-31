/* config for CQL */
// scoringQuestionId is passed as parameter to CQL
const qConfig = {
  behav5: {
    scoringQuestionId: "behav-8",
    failedScores: [1, 2, 3, 4, 5, 6, 7],
  },
  "c-idas": {
    scoringQuestionId: "c-idas-score",
    failedScores: [
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
      37, 38,
    ],
  },
  gad7: {
    scoringQuestionId: "/70274-6",
    failedScores: [16, 17, 18, 19, 20, 21],
  },
  gds: {
    scoringQuestionId: "/48545-8",
    failedScores: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  minicog: {
    customCQL: true,
    scoringQuestionId: "minicog-total-score",
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: [0, 1, 2, 3],
  },
  phq9: {
    scoringQuestionId: "/44261-6",
    failedScores: [20, 21, 22, 23, 24, 25, 26, 27],
  },
  slums: {
    scoringQuestionId: "/71492-3",
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    ],
  },
  "adl-iadl": {
    scoringQuestionId: "adl-iadls-total-score",
  },
};
export default qConfig;
