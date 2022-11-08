/* config for CQL */
// scoringQuestionId is passed as parameter to CQL
const qConfig = {
  "adl-iadl": {
    customCQL: true,
    scoringQuestionId: "adl-iadls-total-score",
  },
  behav5: {
    customCQL: true,
    scoringQuestionId: "behav-8",
    failedScores: [1, 2, 3, 4, 5, 6, 7],
  },
  "c-idas": {
    customCQL: true,
    scoringQuestionId: "c-idas-score",
    failedScores: [
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
      37, 38,
    ],
  },
  "cp-ecog": {
    customCQL: true,
    scoringQuestionId: "cp-ecog-total-score",
  },
  ecog12: {
    customCQL: true,
    scoringQuestionId: "ecog12-total-score",
  },
  gad7: {
    customCQL: true,
    scoringQuestionId: "/70274-6",
    // TODO check education if HS education 21 failed, if less than HS failed scolre is 20
    failedScores: [16, 17, 18, 19],
  },
  gds: {
    customCQL: true,
    scoringQuestionId: "/48545-8",
    failedScores: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  minicog: {
    customCQL: true,
    scoringQuestionId: "minicog-total-score",
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: [0, 1, 2, 3],
  },
  phq9: {
    customCQL: true,
    scoringQuestionId: "/44261-6",
    failedScores: [20, 21, 22, 23, 24, 25, 26, 27],
  },
  slums: {
    customCQL: true,
    scoringQuestionId: "/71492-3",
    comparisonToAlert: "low", // display alert if score is lower than previous
    // TO DO check education, 19 failed scored for less than high school, 20 for high school
    failedScores: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ],
  },
};
export default qConfig;
