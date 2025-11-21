import { isEmptyArray, removeParentheses } from "@util";
import { normalizeLinkId, linkIdEquals } from "@util/fhirUtil";
import CHART_CONFIG from "./chart_config";
import { PHQ9_SI_QUESTION_LINK_ID, PHQ9_SI_ANSWER_SCORE_MAPPINGS } from "@/consts";
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
    questionnaireMatchMode: "fuzzy",
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
    questionnaireMatchMode: "fuzzy",
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
    questionnaireMatchMode: "fuzzy",
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 36, xLabel: "" },
  },
  "CIRG-CNICS-ASSIST-OD": {
    key: "CIRG-CNICS-ASSIST-OD",
    instrumentName: "CNICS ASSIST Overdose",
    title: "Overdose",
    questionnaireMatchMode: "fuzzy",
    highSeverityScoreCutoff: 1,
    comparisonToAlert: "higher",
    displayMeaningNotScore: true,
    scoringQuestionId: "ASSIST-OD-ever",
    questionLinkIds: ["ASSIST-OD-ever", "ASSIST-OD-recent", "ASSIST-OD-narcan"],
    linkIdMatchMode: "strict",
    fallbackScoreMap: {
      "assist-od-ever-0": 1,
      "Assist-od-ever-1": 0,
    },
    severityBands: [
      { min: 1, label: "high", meaning: "Yes" },
      { min: 0, label: "low", meaning: "No" },
    ],
    skipChart: true,
  },
  "CIRG-CNICS-ASSIST-Polysub": {
    key: "CIRG-CNICS-ASSIST-Polysub",
    instrumentName: "CNICS Polysubstance Use",
    title: "Concurrent Drug Use",
    questionnaireMatchMode: "fuzzy",
    highSeverityScoreCutoff: 1,
    displayMeaningNotScore: true,
    scoringQuestionId: "ASSIST-Polysub",
    questionLinkIds: ["ASSIST-Polysub", "ASSIST-Polysub-freq", "ASSIST-Polysub-inject", "ASSIST-Polysub-inject-alt"],
    linkIdMatchMode: "strict",
    fallbackScoreMap: {
      "assist-polysub-0": 1,
      "assist-polysub-1": 0,
    },
    severityBands: [
      { min: 1, label: "high", meaning: "Yes" },
      { min: 0, label: "low", meaning: "No" },
    ],
    skipChart: true,
  },
  "CIRG-CNICS-FINANCIAL": {
    key: "CIRG-CNICS-FINANCIAL",
    instrumentName: "CNICS Financial Situation Questionnaire",
    title: "Financial Situation",
    questionnaireMatchMode: "fuzzy",
    highSeverityScoreCutoff: 1,
    comparisonToAlert: "higher",
    displayMeaningNotScore: true,
    scoringQuestionId: "FINANCIAL-0",
    questionLinkIds: ["FINANCIAL-0"],
    linkIdMatchMode: "strict",
    fallbackScoreMap: {
      "FINANCIAL-0-0": 1,
      "FINANCIAL-0-1": 0,
      "FINANCIAL-0-2": 0,
      "FINANCIAL-0-3": 0,
    },
    severityBands: [
      { min: 1, label: "high" },
      { min: 0, label: "low" },
    ],
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      //console.log("severity ", severity, "responses ", responses);
      let meaning = "";
      responses.forEach((response) => {
        if (meaning) return true;
        if (response.answer) {
          meaning = response.answer.split(",")[0];
        }
      });
      return meaning;
    },
    skipChart: true,
  },
  "CIRG-CNICS-HOUSING": {
    key: "CIRG-CNICS-HOUSING",
    instrumentName: "CNICS Housing Measure",
    title: "Housing",
    subtitle: "Past month",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    questionLinkIds: ["HOUSING-0", "HOUSING-1"],
    linkIdMatchMode: "strict",
    highSeverityScoreCutoff: 1,
    scoringQuestionId: "HOUSING-1",
    fallbackScoreMap: {
      "HOUSING-1-0": 1,
      "HOUSING-1-1": 1,
      "HOUSING-1-2": 0,
      "HOUSING-1-3": 0,
    },
    severityBands: [
      { min: 1, label: "high" },
      { min: 0, label: "low" },
    ],
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      responses.forEach((response) => {
        if (response.answer) {
          if (linkIdEquals(response.id, "HOUSING-0")) {
            arrMeaning.push("<span class='text-normal'>" + removeParentheses(response.answer) + "</span>");
          } else arrMeaning.push(response.answer);
        }
      });
      return arrMeaning.join(",");
    },
    skipChart: true,
  },
  "CIRG-CNICS-FOOD": {
    key: "CIRG-CNICS-FOOD",
    instrumentName: "CNICS Food Security Questionnaire",
    title: "Food Security",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    questionLinkIds: ["FOOD-0", "FOOD-1"],
    scoringQuestionId: "FOOD-score",
    alertQuestionId: "FOOD-critical-flag",
    //TODO remove this when alert flag issue is fixed
    highSeverityScoreCutoff: 2,
    linkIdMatchMode: "strict",
    severityBands: [
      { min: 2, label: "high", meaning: "Low Food Security" },
      { min: 0, label: "low", meaning: "" },
    ],
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      responses.forEach((response) => {
        if (response.answer) {
          arrMeaning.push(removeParentheses(response.answer));
        }
      });
      return arrMeaning.join(",");
    },
    skipChart: true,
  },
  "CIRG-CNICS-IPV4": {
    key: "CIRG-CNICS-IPV4",
    instrumentName: "IPV-4",
    title: "IPV-4",
    questionnaireMatchMode: "fuzzy",
    linkIdMatchMode: "strict",
    questionLinkIds: ["IPV4-1", "IPV4-2", "IPV4-3", "IPV4-4"],
    highSeverityScoreCutoff: 1,
    displayMeaningNotScore: true,
    fallbackScoreMap: {
      "ipv4-1-0": 1,
      "ipv4-1-1": 0,
      "ipv4-2-0": 1,
      "ipv4-2-1": 0,
      "ipv4-3-0": 1,
      "ipv4-3-1": 0,
      "ipv4-4-0": 1,
      "ipv4-4-1": 0,
    },
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity || severity === "low") return "";
      //console.log("severity ", severity, "responses ", responses);
      let arrMeanings = [];
      responses.forEach((response) => {
        if (linkIdEquals(response.linkId, "IPV4-1") && String(response.answer).toLowerCase() === "yes") {
          arrMeanings.push("Felt trapped");
        }
        if (linkIdEquals(response.linkId, "IPV4-2") && String(response.answer).toLowerCase() === "yes") {
          arrMeanings.push("Fearful of harm");
        }
        if (linkIdEquals(response.linkId, "IPV4-3") && String(response.answer).toLowerCase() === "yes") {
          arrMeanings.push("Sexual violence");
        }
        if (linkIdEquals(response.linkId, "IPV4-4") && String(response.answer).toLowerCase() === "yes") {
          arrMeanings.push("Physical violence");
        }
      });
      return arrMeanings.join(", ");
    },
    severityBands: [
      { min: 1, label: "high" },
      { min: 0, label: "low" },
    ],
    skipChart: true,
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
    questionnaireMatchMode: "fuzzy",
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
    questionnaireMatchMode: "fuzzy",
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
    questionnaireMatchMode: "fuzzy",
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
    questionnaireMatchMode: "fuzzy",
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
    questionnaireMatchMode: "fuzzy",
    chartParams: { ...CHART_CONFIG.default },
  },
  "CIRG-PC-PTSD-5": {
    key: "CIRG-PC-PTSD-5",
    questionnaireId: "CIRG-PC-PTSD-5",
    questionnaireName: "CIRG-PC-PTSD-5",
    instrumentName: "The Primary Care PTSD Screen for DSM-5 [PC-PTSD-5]",
    title: "PTSD Symptoms",
    maximumScore: 5,
    highSeverityScoreCutoff: 4,
    comparisonToAlert: "higher",
    questionnaireMatchMode: "fuzzy",
    questionLinkIds: ["/102012-2", "/102013-0", "/102014-8", "/102015-5", "/102016-3"],
    scoringQuestionId: "/102017-1",
    chartParams: { ...CHART_CONFIG.default, title: "PTSD", minimumYValue: 0, maximumYValue: 5, xLabel: "" },
  },
  "CIRG-PHQ9": {
    key: "CIRG-PHQ9",
    questionnaireId: "CIRG-PHQ9",
    questionnaireName: "phq9",
    instrumentName: "Patient Health Questionnaire-9 (PHQ-9)",
    title: "PHQ-9",
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
      //"/44261-6",
      //"/55758-7",
    ],
    itemTextByLinkId: {
      "/55758-7": "PHQ-2 total score",
      "/44261-6": "PHQ-9 total score",
    },
    questionnaireMatchMode: "fuzzy",
    highSeverityScoreCutoff: 20,
    mediumSeverityScoreCutoff: 15,
    severityBands: [
      { min: 20, label: "high", meaning: "severe depression" },
      { min: 15, label: "moderately high", meaning: "moderately severe depression" },
      { min: 10, label: "moderate", meaning: "moderate depression" },
      { min: 5, label: "mild", meaning: "mild depression" },
      { min: 0, label: "low", meaning: "" },
    ],
    chartParams: { ...CHART_CONFIG.default, title: "PHQ-9", minimumYValue: 0, maximumYValue: 27, xLabel: "" },
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
    questionnaireMatchMode: "fuzzy",
    // No questionLinkIds needed—SLUMS uses a single total-score field
    chartParams: { ...CHART_CONFIG.default, title: "SLUMS", minimumYValue: 0, maximumYValue: 30, xLabel: "" },
  },
  "CIRG-SI": {
    key: "CIRG-SI",
    instrumentName: "Suicide Ideation",
    title: "Suicide Ideation",
    scoringQuestionId: PHQ9_SI_QUESTION_LINK_ID,
    fallbackScoreMap: PHQ9_SI_ANSWER_SCORE_MAPPINGS,
    highSeverityScoreCutoff: 3,
    comparisonToAlert: "higher",
    severityBands: [
      { min: 3, label: "high", meaning: "nearly every day" },
      { min: 2, label: "moderate", meaning: "more than half the days" },
      { min: 0, label: "low", meaning: "No" },
    ],
    minimumScore: 0,
    maximumScore: 3,
    displayMeaningNotScore: true,
    // normal instrument defaults you already have, plus:
    deriveFrom: {
      hostIds: ["CIRG-PHQ9"], // one or many hosts
      linkId: "/44260-8", // the single item to keep
      // optional: override how free-text maps to valueCoding
      //normalizeAnswerToCoding: (ans) => ({ valueCoding: { system: "...", code: ..., display: ... }})
    },
    chartParams: { ...CHART_CONFIG.default, title: "Suicide Ideation", minimumYValue: 0, maximumYValue: 3, xLabel: "" },
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
