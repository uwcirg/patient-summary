import {range} from "../util/util"
const qConfig = {
  "adl-iadl": {
    shortTitle: "Functional Impairments (ADL/IADLs)",
    customCQL: true,
  },
  behav5: {
    shortTitle: "BEHAV+5",
    customCQL: true,
    failedScores: () => range(1, 7),
  },
  "c-idas": {
    shortTitle: "Cornell Scale of Depression",
    customCQL: true,
    failedScores: () => range(19, 38),
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
    failedScores: (education) => {
      return range(16, 19);
    },
  },
  gds: {
    shortTitle: "Geriatric Depression Scale",
    customCQL: true,
    failedScores: () => {
      return range(5, 15)
    },
  },
  minicog: {
    shortTitle: "MINI COGNITIVE ASSESSMENT",
    customCQL: true,
    comparisonToAlert: "low", // display alert if score is lower than previous
    failedScores: () => range(0, 3),
  },
  phq9: {
    shortTitle: "Depression (PHQ-9)",
    customCQL: true,
    failedScores: () => {
      return range(20, 27);
    },
  },
  slums: {
    customCQL: true,
    comparisonToAlert: "low", // display alert if score is lower than previous
    // TO DO check education, 19 failed scored for less than high school, 20 for high school
    failedScores: (eduation) => {
      return range(0, 18);
    },
  },
};
export default qConfig;
