/* config for CQL */
// scoringQuestionId is passed as parameter to CQL
const qConfig = {
  minicog: {
    customCQL: true,
    scoringQuestionId: "minicog-total-score",
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: [0, 1, 2]
  },
  phq9: {
    scoringQuestionId: "/44261-6",
    failedScores: [20, 21, 22, 23, 24, 25, 26, 27]
  },
  gad7: {
    scoringQuestionId: "/70274-6",
    failedScores: [16, 17, 18, 19, 20, 21]
  },
  gds: {
    scoringQuestionId: "/48545-8",
  },
  slums: {
    scoringQuestionId: "/71492-3",
  },
  behav5: {
    scoringQuestionId: "behav-8",
  },
};
export default qConfig;
