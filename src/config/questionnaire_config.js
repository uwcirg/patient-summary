import { isEmptyArray } from "@util";
import { linkIdEquals } from "@util/fhirUtil";
import CHART_CONFIG, { SUCCESS_COLOR } from "./chart_config";
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
  const subIds = Array.isArray(config?.subScoringQuestions) ? config.subScoringQuestions.map((o) => o.linkId) : [];

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
 * @param {string} [alertQuestionId] linkId of question that contains alert/critical flag
 * @param {Object|Array} chartParams params for charting line/bar graphs
 * @param {string} [clockLinkId] for Mini-Cog: linkId for clock drawing item
 * @param {Object} [clockScoreMap] for Mini-Cog: map of clock drawing answer to score
 * @param {Object[]} [columns] additional columns to extract from responses
 * @param {boolean} comparisonToAlert 'higher' (default) means higher scores are worse; 'lower' means lower scores are worse
 * @param {boolean} disableHeaderRowSubtitle if true the subtitle won't display in the header row in responses table
 * @param {Object} deriveFrom configuration for deriving score from other questionnaire(s)
 * @param {string[]} [deriveFrom.hostIds] questionnaire keys/ids to derive from
 * @param {string} [deriveFrom.linkId] linkId of the question in the host questionnaire(s) to derive from
 * @param {boolean} [deriveFrom.usePreviousScore] if true, use previous score from host questionnaire(s) instead of current score
 * @param {boolean} displayMeaningNotScore if true, display meaning/label instead of numeric score
 * @param {array} excludeQuestionLinkIdPatterns param for pattern in link Id to exclude as a response item
 * @param {function} fallbackMeaningFunc function to derive meaning from severity and responses
 * @param {Object} [fallbackScoreMap] map of linkId to score
 * @param {number} highSeverityScoreCutoff
 * @param {string} key
 * @param {string} [linkIdMatchMode] 'strict'|'fuzzy'
 * @param {number} maximumScore
 * @param {string} [meaningQuestionId] linkId of question that contains meaning/label for the score
 * @param {number} minimumScore
 * @param {boolean} [nullScoreAllowed] if true, a null score is allowed (not an error)
 * @param {string} questionnaireId
 * @param {string} [questionnaireMatchMode] 'strict'|'fuzzy' - used when matching a Questionnaire FHIR resource to this config
 * @param {string} questionnaireName
 * @param {string} questionnaireUrl
 * @param {string[]} [questionLinkIds] optional, linkIds of questions to include, usually specified if linkId can be different for a question /1111 or 1111
 * @param {string[]} [recallCorrectCodes] for Mini-Cog: coded answers that count as correct for recall items
 * @param {string[]} [recallCorrectStrings] for Mini-Cog: string answers that count as correct for recall items
 * @param {string[]} [recallLinkIds] for Mini-Cog: linkIds for recall items
 * @param {string|null} scoringQuestionId linkId of the question used for scoring
 * @param {{min:number,label:string,meaning?:string}[]} [severityBands]
 * @param {boolean} [skipChart] if true, do not render chart for this questionnaire
 * @param {boolean} [skipMeaningScoreRow] if true, the score/ meaning row in the responses table will not be rendered
 * @param {Object} [subScores] map of sub-score configurations
 * @param {string[]} [subScoringQuestions] optional, object of sub-questions to include for scoring breakdowns
 * @param {string} subtitle
 * @param {string} title (from Questionnaire resource)
 * @param {function} tooltipValueFormatter function to format y value in tooltip
 * @param {function} valueFormatter function to format score value for display
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
  "CIRG-CNICS-ASSIST": {
    key: "CIRG-CNICS-ASSIST",
    instrumentName: "Substance Use",
    questionnaireMatchMode: "strict",
    title: "Substance Use",
    subtitle: "Past 3 months",
    disableHeaderRowSubtitle: true,
    minimumScore: 0,
    maximumScore: 4,
    meaningQuestionId: "ASSIST-3mo-score",
    meaningRowLabel: "Summary (Past 3 months)",
    nullScoreAllowed: true,
    fallbackScoreMap: {
      "assist-10-0": 0,
      "assist-10-1": 1,
      "assist-10-2": 2,
      "assist-10-3": 3,
      "assist-10-4": 4,
      "assist-11-0": 0,
      "assist-11-1": 1,
      "assist-11-2": 2,
      "assist-11-3": 3,
      "assist-11-4": 4,
      "assist-12-0": 0,
      "assist-12-1": 1,
      "assist-12-2": 2,
      "assist-12-3": 3,
      "assist-12-4": 4,
      "assist-13-0": 0,
      "assist-13-1": 1,
      "assist-13-2": 2,
      "assist-13-3": 3,
      "assist-13-4": 4,
      "assist-14-0": 0,
      "assist-14-1": 1,
      "assist-14-2": 2,
      "assist-14-3": 3,
      "assist-14-4": 4,
      "assist-15-0": 0,
      "assist-15-1": 1,
      "assist-15-2": 2,
      "assist-15-3": 3,
      "assist-15-4": 4,
      "assist-16-0": 0,
      "assist-16-1": 1,
      "assist-16-2": 2,
      "assist-16-3": 3,
      "assist-16-4": 4,
      "assist-17-0": 0,
      "assist-17-1": 1,
      "assist-17-2": 2,
      "assist-17-3": 3,
      "assist-17-4": 4,
      "assist-18-0": 0,
      "assist-18-1": 1,
      "assist-18-2": 2,
      "assist-18-3": 3,
      "assist-18-4": 4,
      "assist-19-0": 0,
      "assist-19-1": 1,
      "assist-19-2": 2,
      "assist-19-3": 3,
      "assist-19-4": 4,
    },
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      const meaningResponse = responses.find((response) => linkIdEquals(response.id, "ASSIST-3mo-score", "strict"));
      const meaningAnswer =
        meaningResponse?.answer != null && meaningResponse.answer !== undefined ? meaningResponse.answer : null;
      return meaningAnswer.split(",").join("|");
    },
    subScoringQuestions: [
      {
        key: "ASSIST-10",
        linkId: "ASSIST-10",
      },
      {
        key: "ASSIST-11",
        linkId: "ASSIST-11",
      },
      {
        key: "ASSIST-12",
        linkId: "ASSIST-12",
      },
      {
        key: "ASSIST-13",
        linkId: "ASSIST-13",
      },
      {
        key: "ASSIST-14",
        linkId: "ASSIST-14",
      },
      {
        key: "ASSIST-15",
        linkId: "ASSIST-15",
      },
      {
        key: "ASSIST-16",
        linkId: "ASSIST-16",
      },
      {
        key: "ASSIST-17",
        linkId: "ASSIST-17",
      },
      {
        key: "ASSIST-18",
        linkId: "ASSIST-18",
      },
      {
        key: "ASSIST-19",
        linkId: "ASSIST-19",
      },
    ],
    yLineFields: [
      {
        key: "ASSIST-10",
        label: "Cocaine/crack",
        color: "#6E026F",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-11",
        label: "Methamphetamine",
        color: "#5A7ACD",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-12",
        label: "Heroin",
        color: "#001BB7",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-13",
        label: "Fentanyl",
        color: "#5C6F2B",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-14",
        color: "#725CAD",
        label: "Narcotic pain meds",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-15",
        label: "Sedatives",
        color: "#FF2DD1",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-16",
        label: "Marijuana",
        color: "#00809D",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-17",
        color: "#FF90BB",
        label: "Stimulants",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-18",
        color: "#FF5555",
        label: "Inhalants",
        strokeWidth: 1,
        legendType: "line",
      },
      {
        key: "ASSIST-19",
        color: "#3DB6B1",
        label: "Psychedelics",
        strokeWidth: 1,
        legendType: "line",
      },
    ],
    displayMeaningNotScore: true,
    xLabel: "",
    linkIdMatchMode: "strict",
    chartParams: {
      ...CHART_CONFIG.default,
      title: "Substance Use",
      chartHeight: 360,
      minimumYValue: 0,
      maximumYValue: 4,
      chartMargin: {
        top: 40,
        right: 20,
        left: 32,
        bottom: 10,
      },
      yLabel: "Frequency",
      yLabelVisible: true,
      yTickFormatter: (value) => {
        const labels = {
          0: "Never",
          1: "Once/Twice",
          2: "Monthly",
          3: "Weekly",
          4: "Daily",
        };
        return labels[value] || value;
      },
      yTicks: [0, 1, 2, 3, 4],
      // enableAxisMeaningLabels: true,
      yLabelProps: {
        position: "top",
        angle: 0,
        dy: -16,
        fontSize: "10px",
      },
      showTicks: true,
      connectNulls: true,
      tooltipValueFormatter: (value) => {
        if (value == null || value === undefined) return "No data";
        if (value === 0) return "Never";
        if (value === 1) return "Once or twice";
        if (value === 2) return "Monthly";
        if (value === 3) return "Weekly";
        if (value === 4) return "Daily or almost daily";
        return value;
      },
      wrapperClass: "big",
    },
  },
  "CIRG-CNICS-ASSIST-OD": {
    key: "CIRG-CNICS-ASSIST-OD",
    instrumentName: "CNICS ASSIST Overdose",
    title: "Overdose",
    subtitle: "Past 6 months",
    disableHeaderRowSubtitle: true,
    questionnaireMatchMode: "strict",
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
    meaningRowLabel: "Summary (Past 6 months)",
    skipChart: true,
  },
  "CIRG-CNICS-ASSIST-Polysub": {
    key: "CIRG-CNICS-ASSIST-Polysub",
    instrumentName: "CNICS Polysubstance Use",
    title: "Concurrent Drug Use",
    subtitle: "Past 3 months",
    questionnaireMatchMode: "strict",
    highSeverityScoreCutoff: 1,
    displayMeaningNotScore: true,
    scoringQuestionId: "ASSIST-Polysub",
    linkIdMatchMode: "strict",
    fallbackScoreMap: {
      "assist-polysub-0": 1,
      "assist-polysub-1": 0,
    },
    severityBands: [
      { min: 1, label: "high", meaning: "Yes, concurrent drug use" },
      { min: 0, label: "low", meaning: "No, no concurrent drug use" },
    ],
    meaningRowLabel: "Summary",
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
    subtitle: "Past 12 months",
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
    subtitle: "Past 12 months",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    linkIdMatchMode: "strict",
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      const fallResponse = responses.find((response) => linkIdEquals(response.id, "FROP-Com-0", "strict"));
      const numFalls = fallResponse?.answer != null && fallResponse.answer !== undefined ? fallResponse.answer : null;
      if (numFalls !== null) {
        arrMeaning.push(`Number of falls: ${numFalls.replace(/\bfalls?\b/g, "").trim()}`);
      }
      const edVisitResponse = responses.find((response) => linkIdEquals(response.id, "FROP-Com-1", "strict"));
      const edVisit =
        edVisitResponse?.answer != null && edVisitResponse.answer !== undefined ? edVisitResponse.answer : null;
      if (edVisit !== null) {
        arrMeaning.push(`E/D visit: ${edVisit}`);
      }
      return arrMeaning.join("|");
    },
    meaningRowLabel: "Summary",
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
      const housingResponse = responses.find((response) => linkIdEquals(response.id, "HOUSING-1", "strict"));
      const housingAnswer =
        housingResponse?.answer != null && housingResponse.answer !== undefined ? housingResponse.answer : null;
      return housingAnswer;
    },
    meaningRowLabel: "Summary",
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
      const answerMapping = {
        "IPV4-1": "Felt trapped",
        "IPV4-2": "Fearful of harm",
        "IPV4-3": "Sexual violence",
        "IPV4-4": "Physical violence",
      };
      const answers = responses
        .filter((response) => {
          return (
            (response.answer != null &&
              response.answer !== undefined &&
              linkIdEquals(response.linkId, "IPV4-1", "strict")) ||
            linkIdEquals(response.linkId, "IPV4-2", "strict") ||
            linkIdEquals(response.linkId, "IPV4-3", "strict") ||
            linkIdEquals(response.linkId, "IPV4-4", "strict")
          );
        })
        .map((response) => answerMapping[response.linkId]);
      return answers.join("|");
    },
    alertQuestionId: "IPV4-critical",
    meaningRowLabel: "Summary",
    skipChart: true,
  },
  "CIRG-CNICS-Smoking": {
    key: "CIRG-CNICS-Smoking",
    instrumentName: "CNICS Smoking",
    title: "Nicotine Use",
    questionnaireMatchMode: "fuzzy",
    displayMeaningNotScore: true,
    linkIdMatchMode: "strict",
    excludeQuestionLinkIdPatterns: ["summary"],
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      if (!severity) return "";
      let arrMeaning = [];
      const tobaccoUseResponse = responses.find((response) =>
        linkIdEquals(response.id, "Smoking-Tobacco-Cigs-Summary", "strict"),
      );
      const eCigUseResponse = responses.find((response) => linkIdEquals(response.id, "E-Cigarettes-Summary", "strict"));
      const tobaccoUseAnswer =
        tobaccoUseResponse?.answer != null && tobaccoUseResponse.answer !== undefined
          ? tobaccoUseResponse.answer
          : null;
      const eCigUseAnswer =
        eCigUseResponse?.answer != null && eCigUseResponse.answer !== undefined ? eCigUseResponse.answer : null;
      if (tobaccoUseAnswer) {
        arrMeaning.push("Tobacco cigarettes: " + tobaccoUseAnswer);
      }
      if (eCigUseAnswer) {
        arrMeaning.push("E-Cigarettes: " + eCigUseAnswer);
      }
      return arrMeaning.join("|");
    },
    meaningRowLabel: "Summary",
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
    meaningRowLabel: "Summary",
    disableHeaderRowSubtitle: true,
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
      const arrMeaning = [];
      const bothersALotResponse = responses.find((response) =>
        linkIdEquals(response.id, "Symptoms-bothers-a-lot", "strict"),
      );
      const bothersALotAnswer =
        bothersALotResponse?.answer != null && bothersALotResponse.answer !== undefined
          ? bothersALotResponse.answer
          : null;
      const bothersSomeResponse = responses.find((response) =>
        linkIdEquals(response.id, "Symptoms-bothers-some", "strict"),
      );
      const bothersSomeAnswer =
        bothersSomeResponse?.answer != null && bothersSomeResponse.answer !== undefined
          ? bothersSomeResponse.answer
          : null;
      if (bothersALotAnswer) {
        arrMeaning.push("Bothers a lot: " + bothersALotAnswer);
      }
      if (bothersSomeAnswer) {
        arrMeaning.push("Bothers some: " + bothersSomeAnswer);
      }
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
    subtitle: "Last two weeks",
    questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/phq9",
    scoringQuestionId: "/44261-6",
    note: "PLEASE NOTE: In EPIC, PHQ-9 questions 1 and 2 are used for screening, and only people with a score of 3 or more receive the remaining questions. In the CNICS PRO, people receive questions 1 through 8 if answering remotely and questions 1 through 9 if in person. The CNICS PRO PHQ-9 questions can be skipped, and the scores are calculated only if 7 or more questions are answered.",
    subScoringQuestions: [
      {
        key: "PHQ-2",
        linkId: "/55758-7",
      },
    ],
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
    showNumAnsweredWithScore: true,
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
    subtitle: "Last two weeks",
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
    title: "Antiretroviral (ARV) adherence",
    instrumentName: "CIRG-CNICS-ARV",
  },
  "CIRG-SHORTNESS-OF-BREATH": {
    title: "Shortness of breath",
  },
  "CIRG-SRS": {
    key: "CIRG-SRS",
    title: "Self Rating Scale (SRS)",
    subtitle: "Past 4 weeks",
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
    skipMeaningScoreRow: true,
    skipChart: true,
  },
  "CIRG-LAST-MISSED-DOSE": {
    key: "CIRG-LAST-MISSED-DOSE",
    title: "Last Missed Dose",
    subtitle: "Past 4 weeks",
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
    skipMeaningScoreRow: true,
    skipChart: true,
  },
  "CIRG-VAS": {
    key: "CIRG-VAS",
    title: "Visual Analog Scale",
    subtitle: "Past 4 weeks",
    instrumentName: "VAS",
    scoringQuestionId: "ARV-VAS",
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
    valueFormatter: (value) => (value ? `${value} %` : ""),
    chartParams: {
      ...CHART_CONFIG.default,
      title: "ART Adherence (VAS)",
      minimumYValue: 0,
      maximumYValue: 100,
      xLabel: "",
      yLabel: "value",
      tooltipValueFormatter: (value) => (value ? `${value} %` : ""),
      type: "barchart",
    },
  },
  "CIRG-CNICS-AUDIT": {
    title: "Alcohol Score",
    subtitle: "Past 12 months",
    key: "CIRG-CNICS-AUDIT",
    instrumentName: "CNICS AUDIT (alcohol consumption questions)",
    minimumScore: 0,
    maximumScore: 38,
    scoringQuestionId: "AUDIT-score",
    subScoringQuestions: [
      {
        key: "AUDIT-C-score",
        linkId: "AUDIT-C-score",
      },
      {
        key: "AUDIT-score",
        linkId: "AUDIT-score",
      },
    ],
    displayMeaningNotScore: true,
    linkIdMatchMode: "strict",
    fallbackMeaningFunc: function (severity, responses) {
      if (isEmptyArray(responses)) return "";
      let arrMeaning = [];
      const scoreToReportResponse = responses.find((response) =>
        linkIdEquals(response.id, "AUDIT-qnr-to-report", "strict"),
      );
      const scoreToReport = scoreToReportResponse ? scoreToReportResponse.answer : null;
      const interpretationResponse = responses.find((response) =>
        linkIdEquals(
          response.id,
          scoreToReport === "AUDIT-C" ? "AUDIT-C-score-interpretation" : "AUDIT-score-interpretation",
          "strict",
        ),
      );
      const interpretation = interpretationResponse ? interpretationResponse.answer : null;
      const auditCResponse = responses.find((response) => linkIdEquals(response.id, "AUDIT-C-score", "strict"));
      const auditCScore = auditCResponse ? parseInt(auditCResponse.answer, 10) : null;
      const auditResponse = responses.find((response) => linkIdEquals(response.id, "AUDIT-score", "strict"));
      const auditScore = auditResponse ? parseInt(auditResponse.answer, 10) : null;
      if (scoreToReport === "AUDIT-C" && auditCScore != null) {
        arrMeaning.push(auditCScore + " (AUDIT-C)");
      } else if (scoreToReport === "AUDIT" && auditScore != null) {
        arrMeaning.push(auditScore + " (AUDIT)");
      }
      if (!isEmptyArray(arrMeaning) && interpretation) {
        arrMeaning.push(interpretation);
      }
      return arrMeaning.join("|");
    },
    chartParams: {
      ...CHART_CONFIG.default,
      title: "Alcohol Score",
      minimumYValue: 0,
      maximumYValue: 38,
      xLabel: "",
      scoringQuestionId: "AUDIT-score",
      yLineFields: [
        {
          key: "AUDIT-C-score",
          color: "#3b82f6", // bloo
          strokeWidth: 1,
          legendType: "line",
          //strokeDasharray: "2 2", // dashed line
        },
        {
          key: "AUDIT-score",
          color: SUCCESS_COLOR, // green
          strokeWidth: 1,
          legendType: "line",
        },
      ],
    },
    // skipChart: true,
  },
  "CIRG-CNICS-MINI": {
    key: "CIRG-CNICS-MINI",
    instrumentName: "MINI Score",
    title: "MINI Score",
    subtitle: "Past 12 months",
    minimumScore: 0,
    maximumScore: 7,
    scoringQuestionId: "MINI-score",
    meaningQuestionId: "MINI-score-interpretation",
    excludeQuestionLinkIdPatterns: ["MINI-score-ignoring-skipped"],
    linkIdMatchMode: "strict",
    chartParams: { ...CHART_CONFIG.default, title: "MINI Score", minimumYValue: 0, maximumYValue: 7, xLabel: "" },
  },
  //TODO, implement those
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
    : { ...config, config, scoringSummaryData: { ...config, hasData: false } };
}

const questionnaireConfigs = bootstrapInstrumentConfigMap(questionnaireConfigsRaw);
export default questionnaireConfigs;
