import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";
import CHART_CONFIG from "./chart_config";
import { PHQ9_SI_QUESTION_LINK_ID, PHQ9_SI_ANSWER_SCORE_MAPPINGS } from "@/consts";
import QuestionnaireScoringBuilder from "@/models/resultBuilders/QuestionnaireScoringBuilder";

function normalizeInstrumentConfigKeys(config) {
  if (!config || typeof config !== "object") return config;

  const questionLinkIds =
    config.questionLinkIds ??
    config.questionLInkIds ?? // typo support
    [];

  return {
    ...config,
    questionLinkIds: Array.isArray(questionLinkIds) ? questionLinkIds : [questionLinkIds],
  };
}

function deriveCutoffsFromBands(config, { highLabel = "high", mediumLabel = "moderate" } = {}) {
  const bands = config?.severityBands;
  if (isEmptyArray(bands)) return config;

  const minForLabel = (label) => bands.find((b) => b?.label === label)?.min;

  return {
    ...config,
    highSeverityScoreCutoff: config.highSeverityScoreCutoff ?? minForLabel(highLabel),
    mediumSeverityScoreCutoff: config.mediumSeverityScoreCutoff ?? minForLabel(mediumLabel),
  };
}

function assertCutoffsMatchBands(
  config,
  { highLabel = "high", mediumLabel = "moderate", strict = true, epsilon = 0 } = {},
) {
  const bands = config?.severityBands;
  if (isEmptyArray(bands)) return;
  if (config?.comparisonToAlert === "lower") return; // TODO add assert for this type of comparison, see MINICOG

  const minForLabel = (label) => bands.find((b) => b?.label === label)?.min;
  const problems = [];

  const highMin = minForLabel(highLabel);
  if (highMin != null && config?.highSeverityScoreCutoff != null) {
    if (Math.abs(config.highSeverityScoreCutoff - highMin) > epsilon) {
      problems.push(`highSeverityScoreCutoff (${config.highSeverityScoreCutoff}) != "${highLabel}" min (${highMin})`);
    }
  }

  const mediumMin = minForLabel(mediumLabel);
  if (mediumMin != null && config?.mediumSeverityScoreCutoff != null) {
    if (Math.abs(config.mediumSeverityScoreCutoff - mediumMin) > epsilon) {
      problems.push(
        `mediumSeverityScoreCutoff (${config.mediumSeverityScoreCutoff}) != "${mediumLabel}" min (${mediumMin})`,
      );
    }
  }

  if (problems.length) {
    const msg = `[${config?.key ?? "instrument"}] cutoff mismatch:\n- ${problems.join("\n- ")}`;
    if (strict) throw new Error(msg);
    console.warn(msg, config);
  }
}

function bootstrapInstrumentConfig(config) {
  let out = normalizeInstrumentConfigKeys(config);
  out = deriveCutoffsFromBands(out);

  // validate once (dev only)
  const envDefined = typeof import.meta.env !== "undefined" && import.meta.env;
  // enviroment variables as defined in Node
  if (envDefined && import.meta.env["NODE_ENV"] !== "production") {
    assertCutoffsMatchBands(out, { strict: true });
    assertDeriveFromConfigIsConsistent(out, {
      strict: true,
      allowQuestionLinkIdsSameAsDerived: true, // set to false if never want questionLinkIds present when deriveFrom is set (even if it equals the derived linkId)
    });
    warnIfScoringIdsAreInQuestionLinkIds(out); // warn only
  }
  return out;
}

function assertDeriveFromConfigIsConsistent(config, { strict = true, allowQuestionLinkIdsSameAsDerived = true } = {}) {
  const derive = config?.deriveFrom;
  if (!derive) return;

  const hasHostIds = Array.isArray(derive.hostIds) && derive.hostIds.length > 0;
  const hasLinkId = typeof derive.linkId === "string" && derive.linkId.trim().length > 0;

  // only validate when deriveFrom is actually configured
  if (!hasHostIds && !hasLinkId) return;

  // 1) questionLinkIds should not be used with deriveFrom (or it will be ignored)
  const qids = config?.questionLinkIds;
  if (!isEmptyArray(qids)) {
    const ok =
      allowQuestionLinkIdsSameAsDerived &&
      qids.length === 1 &&
      hasLinkId &&
      linkIdEquals(String(qids[0]), String(derive.linkId), config?.linkIdMatchMode ?? "fuzzy");

    if (!ok) {
      const msg =
        `[${config?.key ?? "instrument"}] deriveFrom is set (hostIds/linkId), so questionLinkIds must be omitted/empty ` +
        `(or it will be ignored). Found questionLinkIds=${JSON.stringify(qids)} deriveFrom.linkId=${JSON.stringify(
          derive.linkId,
        )}`;
      if (strict) throw new Error(msg);
      console.warn(msg, config);
    }
  }

  // 2) scoringQuestionId should match deriveFrom.linkId (if both specified)
  if (hasLinkId) {
    const scoringId = config?.scoringQuestionId;
    if (!scoringId) return;
    if (typeof scoringId === "string" && scoringId.trim().length > 0) {
      const matches = linkIdEquals(String(scoringId), String(derive.linkId), config?.linkIdMatchMode ?? "fuzzy");
      if (!matches) {
        const msg =
          `[${config?.key ?? "instrument"}] scoringQuestionId must match deriveFrom.linkId for derived instruments. ` +
          `scoringQuestionId=${JSON.stringify(scoringId)} deriveFrom.linkId=${JSON.stringify(derive.linkId)}`;
        if (strict) throw new Error(msg);
        console.warn(msg, config);
      }
    } else {
      // If want to require scoringQuestionId whenever deriveFrom.linkId exists, enforce it here:
      const msg =
        `[${config?.key ?? "instrument"}] deriveFrom.linkId is set, but scoringQuestionId is missing. ` +
        `Set scoringQuestionId to deriveFrom.linkId (${JSON.stringify(derive.linkId)}).`;
      if (strict) throw new Error(msg);
      console.warn(msg, config);
    }
  }
}

function warnIfScoringIdsAreInQuestionLinkIds(config) {
  const qids = Array.isArray(config?.questionLinkIds) ? config.questionLinkIds : [];
  if (qids.length === 0) return;

  const mode = config?.linkIdMatchMode ?? "fuzzy";

  const scoringId = typeof config?.scoringQuestionId === "string" ? config.scoringQuestionId : null;
  const subIds = Array.isArray(config?.subScoringQuestionIds) ? config.subScoringQuestionIds : [];

  const contained = [];

  if (scoringId) {
    const found = qids.find((qid) => linkIdEquals(String(qid), String(scoringId), mode));
    if (found) contained.push({ type: "scoringQuestionId", id: scoringId, matched: found });
  }

  for (const sid of subIds) {
    if (!sid) continue;
    const found = qids.find((qid) => linkIdEquals(String(qid), String(sid), mode));
    if (found) contained.push({ type: "subScoringQuestionIds", id: sid, matched: found });
  }

  if (contained.length) {
    console.warn(
      `[${config?.key ?? "instrument"}] questionLinkIds contains scoring id(s). ` +
        `This can cause confusion or double counting. ` +
        `Consider removing these from questionLinkIds.`,
      { contained, questionLinkIds: qids },
    );
  }
}

function bootstrapInstrumentConfigMap(map) {
  const out = {};
  for (const [key, cfg] of Object.entries(map ?? {})) {
    out[key] = bootstrapInstrumentConfig({ key, ...cfg });
  }
  return out;
}

/**
 * @param {string} key
 * @param {string} title (from Questionnaire resource)
 * @param {string} subtitle
 * @param {string} questionnaireId
 * @param {string} questionnaireName
 * @param {string} questionnaireUrl
 * @param {string|null} scoringQuestionId linkId of the question used for scoring
 * @param {string[]} [questionLinkIds] optional, linkIds of questions to include, usually specified if linkId can be different for a question /1111 or 1111
 * @param {string[]}[subScoringQuestionIds] optional, linkIds of sub-questions to include for scoring breakdowns
 * @param {'strict'|'fuzzy'} [questionnaireMatchMode] used when matching a Questionnaire FHIR resource to this config
 * @param {'strict'|'fuzzy'} [linkIdMatchMode]
 * @param {number} highSeverityScoreCutoff
 * @param {number} maximumScore
 * @param {number} minimumScore
 * @param {Object} [fallbackScoreMap] map of linkId to score
 * @param {{min:number,label:string,meaning?:string}[]} [config.severityBands]
 * @param {function} fallbackMeaningFunc
 * @param {boolean} displayMeaningNotScore
 * @param {string[]} [recallLinkIds] for Mini-Cog: linkIds for recall items
 * @param {string} [clockLinkId] for Mini-Cog: linkId for clock drawing item
 * @param {string[]} [recallCorrectCodes] for Mini-Cog: coded answers that count as correct for recall items
 * @param {string[]} [recallCorrectStrings] for Mini-Cog: string answers that count as correct for recall items
 * @param {Object} [clockScoreMap] for Mini-Cog: map of clock drawing answer to score
 * @param {Object[]} [columns] additional columns to extract from responses
 * @param {boolean} [skipChart] if true, do not render chart for this questionnaire
 * @param {Object|Array} chartParams params for charting line/bar graphs
 */
const questionnaireConfigsRaw = {
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
    subtitle: "Past 6 month",
    questionnaireMatchMode: "fuzzy",
    highSeverityScoreCutoff: 1,
    comparisonToAlert: "higher",
    displayMeaningNotScore: true,
    scoringQuestionId: "ASSIST-OD-recent",
    linkIdMatchMode: "strict",
    fallbackScoreMap: {
      "assist-od-recent-0": 0,
      "assist-od-recent-1": 1,
      "assist-od-recent-2": 2,
      "assist-od-recent-3": 3,
      "assist-od-recent-4": 4,
    },
    severityBands: [
      { min: 1, label: "high", meaning: "Yes, overdose" },
      { min: 0, label: "low", meaning: "No overdose" },
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
    linkIdMatchMode: "strict",
    fallbackScoreMap: {
      "FINANCIAL-0-0": 1,
      "FINANCIAL-0-1": 0,
      "FINANCIAL-0-2": 0,
      "FINANCIAL-0-3": 0,
    },
    alertQuestionId: "FINANCIAL-critical-flag",
    meaningQuestionId: "FINANCIAL-score-label",
    skipChart: true,
  },
  "CIRG-CNICS-FOOD": {
    key: "CIRG-CNICS-FOOD",
    instrumentName: "CNICS Food Security Questionnaire",
    title: "Food Security",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    scoringQuestionId: "FOOD-score",
    alertQuestionId: "FOOD-critical-flag",
    meaningQuestionId: "FOOD-score-label",
    linkIdMatchMode: "strict",
    skipChart: true,
  },
  "CIRG-CNICS-FROP-Com": {
    key: "CIRG-CNICS-FROP-Com",
    instrumentName: "Falls Risk for Older People in the Community (FROP-Com)",
    title: "Falls",
    subtitle: "Past year",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    linkIdMatchMode: "strict",
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      responses.forEach((response) => {
        const answered = response.answer != null && response.answer !== undefined;
        if (linkIdEquals(response.id, "FROP-Com-0")) {
          arrMeaning.push(answered ? response.answer.replace(/\bfalls?\b/g, "").trim() : "");
        }
        if (linkIdEquals(response.id, "FROP-Com-1")) {
          if (answered) {
            arrMeaning.push("E/D visit: " + response.answer);
          }
        }
      });
      return arrMeaning.join("|");
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
    linkIdMatchMode: "strict",
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      responses.forEach((response) => {
        if (response.answer) {
          if (linkIdEquals(response.id, "HOUSING-0")) {
            return true;
          } else arrMeaning.push(response.answer);
        }
      });
      return arrMeaning.join("|");
    },
    skipChart: true,
  },
  "CIRG-CNICS-IPV4": {
    key: "CIRG-CNICS-IPV4",
    instrumentName: "IPV-4",
    title: "Concern for IPV",
    subtitle: "Past year",
    questionnaireMatchMode: "fuzzy",
    linkIdMatchMode: "strict",
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
      return arrMeanings.join("|");
    },
    severityBands: [
      { min: 1, label: "high" },
      { min: 0, label: "low" },
    ],
    skipChart: true,
  },
  "CIRG-CNICS-Smoking": {
    key: "CIRG-CNICS-Smoking",
    instrumentName: "CNICS Smoking",
    title: "Nicotine Use",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    linkIdMatchMode: "strict",
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      responses.forEach((response) => {
        const answered = response.answer != null && response.answer !== undefined;
        if (linkIdEquals(response.id, "Smoking-Tobacco-Cigs-Summary")) {
          if (answered) {
            arrMeaning.push("Tobacco cigarettes: " + response.answer);
          }
        }
        if (linkIdEquals(response.id, "E-Cigarettes-Summary")) {
          if (answered) {
            arrMeaning.push("E-Cigarettes: " + response.answer);
          }
        }
      });
      return arrMeaning.join("|");
    },
    skipChart: true,
  },
  "CIRG-CNICS-Symptoms": {
    key: "CIRG-CNICS-Symptoms",
    instrumentName: "CNICS Symptoms Checklist",
    title: "Current Symptoms",
    subtitle: "From {date} assessment",
    questionnaireMatchMode: "fuzzy",
    linkIdMatchMode: "strict",
    displayMeaningNotScore: true,
    columns: [
      {
        linkId: "Symptoms-bothers-a-lot",
        id: "bothersALot",
      },
      {
        linkId: "Symptoms-bothers-some",
        id: "bothersSome",
      },
    ],
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      let arrMeaning = [];
      responses.forEach((response) => {
        const answered = response.answer != null && response.answer !== undefined;
        if (linkIdEquals(response.id, "Symptoms-bothers-a-lot")) {
          if (answered) {
            arrMeaning.push("Bothers a lot: " + response.answer);
          }
        }
        if (linkIdEquals(response.id, "Symptoms-bothers-some")) {
          if (answered) {
            arrMeaning.push("Bothers some: " + response.answer);
          }
        }
      });
      return arrMeaning.join("|");
    },
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
    subtitle: "Past month",
    maximumScore: 5,
    highSeverityScoreCutoff: 1,
    severityBands: [
      { min: 1, label: "high", meaning: "Positive screen" },
      { min: 0, label: "low", meaning: "Negative screen" },
    ],
    comparisonToAlert: "higher",
    questionnaireMatchMode: "fuzzy",
    questionLinkIds: ["/102012-2", "/102013-0", "/102014-8", "/102015-5", "/102016-3"],
    scoringQuestionId: "/102017-1",
    chartParams: {
      ...CHART_CONFIG.default,
      title: "PTSD",
      minimumYValue: 0,
      maximumYValue: 5,
      xLabel: "",
      type: "barchart",
    },
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
    mediumSeverityScoreCutoff: 10,
    severityBands: [
      { min: 20, label: "high", meaning: "Severe depression" },
      { min: 15, label: "moderately high", meaning: "Moderately severe depression" },
      { min: 10, label: "moderate", meaning: "Moderate depression" },
      { min: 5, label: "mild", meaning: "Mild depression" },
      { min: 0, label: "low", meaning: "Minimal depression" },
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
    mediumSeverityScoreCutoff: 2,
    comparisonToAlert: "higher",
    severityBands: [
      { min: 3, label: "high", meaning: "Nearly every day" },
      { min: 2, label: "moderate", meaning: "More than half the days" },
      { min: 1, label: "mild", meaning: "Several days" },
      { min: 0, label: "low", meaning: "Not at all" },
    ],
    minimumScore: 0,
    maximumScore: 3,
    displayMeaningNotScore: true,
    deriveFrom: {
      hostIds: ["CIRG-PHQ9"], // one or many hosts
      linkId: PHQ9_SI_QUESTION_LINK_ID, // the single item to keep
      // optional: override how free-text maps to valueCoding
      //normalizeAnswerToCoding: (ans) => ({ valueCoding: { system: "...", code: ..., display: ... }})
    },
    chartParams: {
      ...CHART_CONFIG.default,
      title: "Suicide Ideation",
      minimumYValue: 0,
      maximumYValue: 3,
      xLabel: "",
      yLabel: "value",
      type: "barchart",
    },
  },
  "CIRG-CNICS-ARV": {
    key: "CIRG-CNICS-ARV",
    questionnaireId: "CIRG-CNICS-ARV",
    title: "CNICS Antiretroviral (ARV) medications and adherence",
    instrumentName: "CIRG-CNICS-ARV",
  },
  "CIRG-SHORTNESS-OF-BREATH": {
    title: "Shortness of breath",
  },
  "CIRG-SRS": {
    key: "CIRG-SRS",
    title: "Self Rating Scale (SRS)",
    instrumentName: "Self Rating Scale (SRS)",
    displayMeaningNotScore: true,
    deriveFrom: {
      hostIds: ["CIRG-CNICS-ARV"], // one or many hosts
      linkId: "ARV-SRS", // the single item to keep
    },
    columns: [
      {
        linkId: "SARV-SRS",
        id: "result",
      },
    ],
    skipChart: true,
  },
  "CIRG-LAST-MISSED-DOSE": {
    key: "CIRG-LAST-MISSED-DOSE",
    title: "Last Missed Dose",
    instrumentName: "Last Missed Dose",
    displayMeaningNotScore: true,
    deriveFrom: {
      hostIds: ["CIRG-CNICS-ARV"], // one or many hosts
      linkId: "ARV-last-missed", // the single item to keep
    },
    columns: [
      {
        linkId: "ARV-last-missed",
        id: "result",
      },
    ],
    skipChart: true,
  },
  "CIRG-VAS": {
    key: "CIRG-VAS",
    title: "Visual Analog Scale",
    subtitle: "percentage",
    instrumentName: "VAS",
    displayMeaningNotScore: true,
    deriveFrom: {
      hostIds: ["CIRG-CNICS-ARV"], // one or many hosts
      linkId: "ARV-VAS", // the single item to keep
    },
    columns: [
      {
        linkId: "ARV-VAS",
        id: "result",
      },
    ],
    skipChart: true,
  },
  "CIRG-ALCOHOL-USE": {
    title: "Alcohol Score (Audit)",
    key: "CIRG-ALCOHOL-USE",
    instrumentName: "Alcohol Use",
    minimumScore: 0,
    maximumScore: 45,
    highSeverityScoreCutoff: 35,
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 45, xLabel: "" },
  },
  "CIRG-MINI-SCORE": {
    key: "CIRG-MINI-SCORE",
    instrumentName: "MINI Score",
    title: "MINI Score",
    minimumScore: 0,
    maximumScore: 5,
    highSeverityScoreCutoff: 4,
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 5, xLabel: "" },
  },

  //TODO, implement those
  "CIRG-DRUG-USE": {
    key: "CIRG-DRUG-USE",
    instrumentName: "Drug Use",
    title: "Drug Use",
  },
  "CIRG-IDU": {
    key: "CIRG-IDU",
    instrumentName: "IDU",
    title: "IDU",
  },
  "CIRG-CONCURRENT-IDU": {
    key: "CIRG-CONCURRENT-IDU",
    instrumentName: "Concurrent IDU",
    title: "Concurrent IDU",
  },
  "CIRG-NALOXONE-ACCESS": {
    key: "CIRG-NALOXONE-ACCESS",
    instrumentName: "Naloxone Access",
    title: "Naloxone Access",
  },
  "CIRG-FENTANYL-STRIP-ACCESS": {
    key: "CIRG-FENTANYL-STRIP-ACCESS",
    instrumentName: "Fentanyl Test Strip Access",
    title: "Fentanyl Test Strip Access",
  },
  "CIRG-SEXUAL-PARTNERS": {
    key: "CIRG-SEXUAL-PARTNERS",
    instrumentName: "Number of Sexual Partners",
    title: "# of Sex Partners x 3 months",
  },
  "CIRG-UNPROTECTED-SEX": {
    key: "CIRG-UNPRTECTED-SEX",
    instrumentName: "Unprotected Sex",
    title: "Unprotected Sex",
  },
  "CIRG-EXCHANGE-SEX": {
    key: "CIRG-EXCHANGE-SEX",
    insturmentName: "Exchange Sex",
    title: "Exchange Sex",
  },
  "CIRG-STI": {
    key: "CIRG-STI",
    instrumentName: "STI",
    title: "STI",
  },
  "CIRG-SOCIAL-SUPPORT": {
    key: "CIRG-SOCIAL-SUPPORT",
    instrumentName: "Social Support",
    title: "Social Support",
  },
  "CIRG-HIV-STIGMA": {
    key: "CIRG-HIV-STIGMA",
    instrumentName: "HIV Stigma",
    title: "HIV Stigma",
  },
  "CIRG-HRQOL": {
    key: "CIRG-HRQOL",
    instrumentName: "HRQOL",
    title: "HRQOL",
  },
};

export const getConfigForQuestionnaire = (id) => {
  return (
    questionnaireConfigs[String(id)] ||
    questionnaireConfigs[String(id).toUpperCase()] ||
    questionnaireConfigs[String(id).toLowerCase()] ||
    null
  );
};
export function findMatchingQuestionLinkIdFromCode(resource, linkIdList, config) {
  if (!resource) return null;
  if (!resource?.code?.coding) return null;
  if (isEmptyArray(linkIdList)) return null;

  for (const coding of resource.code.coding) {
    const match = linkIdList.find((id) =>
      linkIdEquals(String(id), String(coding.code), config?.linkIdMatchMode ?? "fuzzy"),
    );
    if (match) {
      return match;
    }
  }
  return null;
}
export function getProcessedQuestionnaireData(questionnaireId, opts = {}) {
  const { summaryData, bundle } = opts;
  if (summaryData && summaryData[questionnaireId]) return summaryData[questionnaireId];
  const config = summaryData?.questionnaireId?.config || getConfigForQuestionnaire(questionnaireId);
  if (!config) return null;
  const qb = new QuestionnaireScoringBuilder(config, bundle);
  const processedSummaryData = qb._summariesByQuestionnaireRef(bundle);
  return processedSummaryData && processedSummaryData?.scoringSummaryData
    ? processedSummaryData
    : { ...config, config, scoringSummaryData: config };
}

const questionnaireConfigs = bootstrapInstrumentConfigMap(questionnaireConfigsRaw);
export default questionnaireConfigs;
