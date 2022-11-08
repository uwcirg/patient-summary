/* config for CQL */
// scoringQuestionId is passed as parameter to CQL
const qConfig = {
  "adl-iadl": {
    customCQL: true,
  },
  behav5: {
    customCQL: true,
    failedScores: [1, 2, 3, 4, 5, 6, 7],
  },
  "c-idas": {
    customCQL: true,
    failedScores: [
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
      37, 38,
    ],
  },
  "cp-ecog": {
    customCQL: true,
  },
  ecog12: {
    customCQL: true,
  },
  gad7: {
    customCQL: true,
    // TODO check education if HS education 21 failed, if less than HS failed scolre is 20
    failedScores: [16, 17, 18, 19],
  },
  gds: {
    customCQL: true,
    failedScores: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  minicog: {
    customCQL: true,
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: [0, 1, 2, 3],
  },
  phq9: {
    customCQL: true,
    failedScores: [20, 21, 22, 23, 24, 25, 26, 27],
  },
  slums: {
    customCQL: true,
    comparisonToAlert: "low", // display alert if score is lower than previous
    // TO DO check education, 19 failed scored for less than high school, 20 for high school
    failedScores: [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ],
  },
};
export default qConfig;
