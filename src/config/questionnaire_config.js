import { isEmptyArray } from "@util";
import { normalizeLinkId } from "@util/fhirUtil";
import CHART_CONFIG from "./chart_config";
const questionnaireConfigs = {
  "CIRG-ADL-IADL": {
    key: "CIRG-ADL-IADL",
    questionnaireId: "CIRG-ADL-IADL",
    questionnaireName: "adl-iadl",
    instrumentName: "ADL-IADL",
    title: "ADL IADL",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/adl-iadl",
    scoringQuestionId: "adl-iadls-total-score",
    maximumScore: 45,
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
    chartParams: { ...CHART_CONFIG.default, xLabel: "" },
  },
  "CIRG-BEHAV5": {
    key: "CIRG-BEHAV5",
    questionnaireId: "CIRG-BEHAV5",
    questionnaireName: "behav5",
    instrumentName: "BEHAV-5",
    title: "BEHAV-5",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/behav5",
    scoringQuestionId: "behav-8",
    maximumScore: 6,
    questionLinkIds: ["behav-1", "behav-2", "behav-3", "behav-4", "behav-5", "behav-6"],
    matchMode: "fuzzy",
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 6, xLabel: "" },
  },
  "CIRG-C-IDAS": {
    key: "CIRG-C-IDAS",
    questionnaireId: "CIRG-C-IDAS",
    questionnaireName: "c-idas",
    instrumentName: "C-IDAS",
    title: "C-IDAS",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/c-idas",
    scoringQuestionId: "c-ids-score",
    maximumScore: 36,
    matchMode: "fuzzy",
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 36, xLabel: "" },
  },
  "CIRG-CP-ECOG": {
    key: "CIRG-CP-ECOG",
    questionnaireId: "CIRG-CP-ECOG",
    questionnaireName: "cp-ecog",
    instrumentName: "CP-ECOG",
    title: "CP-ECOG",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/cp-ecog",
    scoringQuestionId: "cp-ecog-total-score",
    maximumScore: 48,
    matchMode: "fuzzy",
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
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 48, xLabel: "" },
  },
  "CIRG-ECOG12": {
    key: "CIRG-ECOG12",
    questionnaireId: "CIRG-ECOG12",
    questionnaireName: "ecog12",
    instrumentName: "ECOG-12",
    title: "ECOG-12",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/ecog12",
    scoringQuestionId: "ecog12-total-score",
    maximumScore: 48,
    matchMode: "fuzzy",
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
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 48, xLabel: "" },
  },
  "CIRG-GAD7": {
    key: "CIRG-GAD7",
    questionnaireId: "CIRG-GAD7",
    questionnaireName: "gad7",
    instrumentName: "GAD-7",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/gad7",
    scoringQuestionId: "/70274-6",
    maximumScore: 21,
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
    mediumSeverityScoreCutoff: 10,
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 21, xLabel: "" },
  },
  "CIRG-GDS": {
    key: "CIRG-GDS",
    questionnaireId: "CIRG-GDS",
    questionnaireName: "gds",
    instrumentName: "GDS",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/gds",
    scoringQuestionId: "/48545-8",
    maximumScore: 15,
    matchMode: "fuzzy",
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
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 15, xLabel: "" },
  },
  "CIRG-MINICOG": {
    key: "CIRG-MINICOG",
    questionnaireId: "CIRG-MINICOG",
    questionnaireName: "MINICOG",
    instrumentName: "MINI-COG",
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
    chartParams: { ...CHART_CONFIG.default },
  },
  "CIRG-PHQ9": {
    key: "CIRG-PHQ9",
    questionnaireId: "CIRG-PHQ9",
    questionnaireName: "phq9",
    instrumentName: "PHQ-9",
    title: "Patient Health Questionnaire-9 (PHQ-9)",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/phq9",
    scoringQuestionId: "/44261-6",
    subScoringQuestionIds: ["/55758-7"],
    maximumScore: 27,
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
      //"/69722-7",
      "/44261-6",
      "/55758-7",
    ],
    itemTextByLinkId: {
      "/55758-7": "PHQ-2 total score",
      "/44261-6": "PHQ-9 total score",
    },
    matchMode: "fuzzy",
    highSeverityScoreCutoff: 20,
    mediumSeverityScoreCutoff: 15,
    severityBands: [
      { min: 20, label: "high", meaning: "severe depression" },
      { min: 15, label: "moderately high", meaning: "moderately severe depression" },
      { min: 10, label: "moderate", meaning: "moderate depression" },
      { min: 5, label: "mild", meaning: "mild depression" },
      { min: 0, label: "low", meaning: "" },
    ],
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 27, xLabel: "" },
  },
  "CIRG-SLUMS": {
    key: "CIRG-SLUMS",
    questionnaireId: "CIRG-SLUMS",
    questionnaireName: "slums",
    instrumentName: "SLUMS",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/slums",
    scoringQuestionId: "/71492-3", // total score item
    questionLinkIds: ["/71492-3"],
    maximumScore: 30,
    comparisonToAlert: "lower",
    matchMode: "fuzzy",
    // No questionLinkIds needed—SLUMS uses a single total-score field
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 30, xLabel: "" },
  },
  "CIRG-CNICS-IPV4": {
    key: "CIRG-CNICS-IPV4",
    instrumentName: "IPV-4",
    title: "IPV-4",
    matchMode: "fuzzy",
    questionLinkIds: [
      "IPV4-1",
      "IPV4-2",
      "IPV4-3",
      "IPV4-4",
    ],
  },
};

export const getConfigForQuestionnaire = (id) => {
  return questionnaireConfigs[String(id).toUpperCase()] || null;
};
export function findMatchingQuestionLinkIdFromCode(resource, linkIdList) {
  if (!resource) return null;
  if (!resource?.code?.coding) return null;
  if (isEmptyArray(linkIdList)) return null;

  for (const coding of resource.code.coding) {
    const match = linkIdList.find((id) => normalizeLinkId(id) === normalizeLinkId(coding.code));
    if (match) {
      return match;
    }
  }

  return null; // no match found
}

export default questionnaireConfigs;
