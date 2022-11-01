export const QUESTIONNAIRE_ANCHOR_ID_PREFIX = "questionnaireAnchor";
export const queryPatientIdKey = "launch_queryPatientId";
export const NO_CACHE_HEADER = {
  headers: {
    "Cache-Control": "no-cache, no-store, max-age=0",
  },
};
export const instrumentNameMaps = {
  phq9: "Depression (PHQ-9)",
  gad7: "Anxiety (GAD-7)",
  behav: "BEHAV+5",
  minicog: "Mini Cognitive Assessment",
  ecog12: "ECog-12",
  "cp-ecog": "ECog-12 (for Care Partner)",
  "c-idas": "Cornell Scale of Depression",
  "adl-iadl": "Functional Impairments (ADL/IADLs)",
};
