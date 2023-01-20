const qConfig = {
  "adl-iadl": {
    shortTitle: "Functional Impairments (ADL/IADLs)",
    customCQL: true,
  },
  behav5: {
    shortTitle: "BEHAV+5",
    customCQL: true,
  },
  "c-idas": {
    shortTitle: "Cornell Scale of Depression",
    customCQL: true,
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
  },
  gds: {
    shortTitle: "Geriatric Depression Scale",
    customCQL: true,
  },
  minicog: {
    shortTitle: "MINI COGNITIVE ASSESSMENT",
    customCQL: true,
    comparisonToAlert: "lower", // display alert if score is lower than previous
  },
  phq9: {
    shortTitle: "Depression (PHQ-9)",
    customCQL: true,
  },
  slums: {
    customCQL: true,
    comparisonToAlert: "lower", // display alert if score is lower than previous
  },
};
export default qConfig;
