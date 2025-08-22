const questionnaireConfigs = {
  "CIRG-ADL-IADL": {
    questionnaireId: "CIRG-ADL-IADL",
    questionnaireName: "adl-iadl",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/adl-iadl",
    scoringQuestionId: "adl-iadls-total-score",
    scoringParams: { maximumScore: 45 },
    questionLinkIds: [
      "/46595-5",
      "/46597-1",
      "/46599-7",
      "/57243-8",
      "/57244-6",
      "/57246-1",
      "/57247-9",
      "/57248-7",
      "/57249-5",
      "/46569-0",
    ],
    matchMode: "fuzzy",
  },
  "CIRG-BEHAV5": {
    questionnaireId: "CIRG-BEHAV5",
    questionnaireName: "behav5",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/behav5",
    scoringQuestionId: "behav-8",
    scoringParams: { maximumScore: 6 },
    questionLinkIds: ["behav-1", "behav-2", "behav-3", "behav-4", "behav-5", "behav-6"],
    matchMode: "fuzzy",
  },
  "CIRG-C-IDAS": {
    questionnaireId: "CIRG-C-IDAS",
    questionnaireName: "c-idas",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/c-idas",
    scoringQuestionId: "c-ids-score", // from your CQL
    scoringParams: { maximumScore: 36 },
    matchMode: "fuzzy",
  },
  "CIRG-CP-ECOG": {
    questionnaireId: "CIRG-CP-ECOG",
    questionnaireName: "cp-ecog",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/cp-ecog",
    scoringQuestionId: "cp-ecog-total-score",
    scoringParams: { maximumScore: 48 },
    matchMode: "fuzzy", // mirrors CQL PositionOf behavior
    questionLinkIds: [
      "/89286-9/89146-5",
      "/89286-9/89149-9",
      "/89287-7/89172-1",
      "/89287-7/89138-2",
      "/89288-5/89154-9",
      "/89288-5/89165-5",
      "/89289-3/89143-2",
      "/89289-3/89140-8",
      "/89290-1/89158-0",
      "/89290-1/89173-9",
      "/89285-1/89141-6",
      "/89285-1/89171-3",
    ],
    // Optional: add severityBands if you have thresholds (example only)
    // severityBands: [
    //   { min: 37, label: 'high',     meaning: 'severe impairment' },
    //   { min: 25, label: 'moderate', meaning: 'moderate impairment' },
    //   { min: 13, label: 'mild',     meaning: 'mild impairment' },
    //   { min: 0,  label: 'low',      meaning: 'minimal impairment' },
    // ],
    // highSeverityScoreCutoff: 37, // if you define bands/cutoff
  },
  "CIRG-ECOG12": {
    questionnaireId: "CIRG-ECOG12",
    questionnaireName: "ecog12",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/ecog12",
    scoringQuestionId: "ecog12-total-score",
    scoringParams: { maximumScore: 48 },
    matchMode: "fuzzy", // aligns with PositionOf matching in CQL
    questionLinkIds: [
      "/89286-9/89146-5",
      "/89286-9/89149-9",
      "/89287-7/89172-1",
      "/89287-7/89138-2",
      "/89288-5/89154-9",
      "/89288-5/89165-5",
      "/89289-3/89143-2",
      "/89289-3/89140-8",
      "/89290-1/89158-0",
      "/89290-1/89173-9",
      "/89285-1/89141-6",
      "/89285-1/89171-3",
    ],
    // Optional: severity bands and cutoff if you have them
    // severityBands: [
    //   { min: 37, label: 'high',     meaning: 'severe impairment' },
    //   { min: 25, label: 'moderate', meaning: 'moderate impairment' },
    //   { min: 13, label: 'mild',     meaning: 'mild impairment' },
    //   { min: 0,  label: 'low',      meaning: 'minimal impairment' },
    // ],
    // highSeverityScoreCutoff: 37,
  },
  "CIRG-GAD7": {
    questionnaireId: "CIRG-GAD7",
    questionnaireName: "gad7",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/gad7",
    scoringQuestionId: "/70274-6",
    scoringParams: { maximumScore: 21 },
    questionLinkIds: ["/69725-0", "/68509-9", "/69733-4", "/69734-2", "/69735-9", "/69689-8", "/69736-7"],
    matchMode: "fuzzy",
    severityBands: [
      { min: 15, label: "high", meaning: "severe anxiety" },
      { min: 10, label: "moderate", meaning: "moderate anxiety" },
      { min: 5, label: "mild", meaning: "mild anxiety" },
      { min: 0, label: "low", meaning: "minimal anxiety" },
    ],
    // optional (defaults to top band min = 15 anyway)
    highSeverityScoreCutoff: 15,
  },
  "CIRG-GDS": {
    questionnaireId: "CIRG-GDS",
    questionnaireName: "gds",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/gds",
    scoringQuestionId: "/48545-8",
    scoringParams: { maximumScore: 15 },
    matchMode: "fuzzy", // aligns with PositionOf matching in CQL
    questionLinkIds: [
      "/48512-8",
      "/48513-6",
      "/48514-4",
      "/48515-1",
      "/48518-5",
      "/48519-3",
      "/48520-1",
      "/48521-9",
      "/48523-5",
      "/48525-0",
      "/48526-8",
      "/48528-4",
      "/48532-6",
      "/48533-4",
      "/48534-2",
    ],
    // Optional: severity mapping if desired
    // severityBands: [
    //   { min: 11, label: 'high',     meaning: 'severe depression' },
    //   { min: 6,  label: 'moderate', meaning: 'moderate depression' },
    //   { min: 1,  label: 'mild',     meaning: 'mild depression' },
    //   { min: 0,  label: 'low',      meaning: 'no depression' },
    // ],
    // highSeverityScoreCutoff: 11,
  },
  "CIRG-MINICOG": {
    questionnaireId: "CIRG-MINICOG",
    questionnaireName: "MINICOG",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/minicog",
    recallLinkIds: ["/recall-1", "/recall-2", "/recall-3"],
    clockLinkId: "/clock",
    // What counts as "correct" for recall (pick your reality):
    recallCorrectCodes: ["correct", "present", "Y"], // if coded
    recallCorrectStrings: ["correct", "present", "yes"], // if strings
    // Clock scoring: map whichever value you use to 0 or 2
    clockScoreMap: {
      normal: 2,
      abnormal: 0,
      2: 2,
      0: 0,
    },
    // Total severity bands for Mini-Cog
    severityBands: [
      { min: 3, label: "low", meaning: "unlikely impairment" },
      { min: 0, label: "high", meaning: "possible impairment" }, // catch-all for 0–2
    ],
    highSeverityScoreCutoff: 2, // flag when total ≤ 2 (common rule)
    comparisonToAlert: "lower",
    matchMode: "fuzzy",
  },
  "CIRG-PHQ9": {
    questionnaireId: "CIRG-PHQ9",
    questionnaireName: "phq9",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/phq9",
    scoringQuestionId: "/44261-6",
    scoringParams: { maximumScore: 27 },
    questionLinkIds: [
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
    matchMode: "fuzzy",
    highSeverityScoreCutoff: 20,
    severityBands: [
      { min: 20, label: "high", meaning: "severe depression" },
      { min: 15, label: "moderately high", meaning: "moderately severe depression" },
      { min: 10, label: "moderate", meaning: "moderate depression" },
      { min: 5, label: "mild", meaning: "mild depression" },
      { min: 0, label: "low", meaning: "" },
    ],
  },
  "CIRG-SLUMS": {
    questionnaireId: "CIRG-SLUMS",
    questionnaireName: "slums",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/slums",
    scoringQuestionId: "/71492-3", // total score item
    questionLinkIds: ["/71492-3"],
    scoringParams: { maximumScore: 30 },
    comparisonToAlert: "lower",
    matchMode: "fuzzy",
    // No questionLinkIds needed—SLUMS uses a single total-score field
  },
};

export const getConfigForQuestionnaire = (id) => {
  return questionnaireConfigs[String(id).toUpperCase()] || null;
};

export default questionnaireConfigs;
