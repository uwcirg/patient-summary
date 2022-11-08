const qConfig = {
  "adl-iadl": {
    shortTitle: "Functional Impairments (ADL/IADLs)",
    customCQL: true,
  },
  behav5: {
    shortTitle: "BEHAV+5",
    customCQL: true,
    failedScores: () => [1, 2, 3, 4, 5, 6, 7],
  },
  "c-idas": {
    shortTitle: "Cornell Scale of Depression",
    customCQL: true,
    failedScores: () => [
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
      37, 38,
    ],
  },
  "cp-ecog": {
    shortTitle: "ECOG-12 (for Care Partner)",
    customCQL: true,
  },
  ecog12: {
    shortTitle: "ECOG-12",
    customCQL: true,
  },
  gad7: {
    shortTitle: "Anxiety (GAD-7)",
    customCQL: true,
    // TODO check education if HS education 21 failed, if less than HS failed scolre is 20
    failedScores: (education) => [16, 17, 18, 19],
  },
  gds: {
    shortTitle: "Geriatric Depression Scale",
    customCQL: true,
    failedScores: () => [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  minicog: {
    shortTitle: "MINI COGNITIVE ASSESSMENT",
    customCQL: true,
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: () => [0, 1, 2, 3],
  },
  phq9: {
    shortTitle: "Depression (PHQ-9)",
    customCQL: true,
    failedScores: () => [20, 21, 22, 23, 24, 25, 26, 27],
  },
  slums: {
    customCQL: true,
    comparisonToAlert: "low", // display alert if score is lower than previous
    // TO DO check education, 19 failed scored for less than high school, 20 for high school
    failedScores: (eduation) => [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ],
  },
};
export default qConfig;
