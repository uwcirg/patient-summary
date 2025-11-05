import { Stack } from "@mui/material";
import { linkIdEquals } from "@util/fhirUtil";
import { PHQ9_SI_ANSWER_SCORE_MAPPINGS, PHQ9_SI_QUESTION_LINK_ID } from "@consts";
import { isEmptyArray, isNumber, deepMerge } from "@util";
import CHART_CONFIG from "./chart_config";
import questionnaireConfigs from "./questionnaire_config";
import { getScoreParamsFromResponses } from "@/models/resultBuilders/helpers";

export const getInstrumentDefaults = () => {
  const keys = Object.keys(questionnaireConfigs);
  return keys.map((key) => {
    return questionnaireConfigs[key];
  });
};

export const INSTRUMENT_DEFAULTS = {
  ...getInstrumentDefaults(),
  "CIRG-PHQ9-SI": {
    title: "Suicide Ideation",
    scoringParams: { minimumScore: 0, maximumScore: 3, highSeverityScoreCutoff: 3, comparisonToAlert: "higher" },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 3, xLabel: "" },
  },
  "CIRG-Overdose": {
    title: "Overdose",
  },
  "CIRG-Food-Security": {
    title: "Food Security",
  },
  "CIRG-Financial-Situation": {
    title: "Financial Situation",
  },
  "CIRG-SYMPTOMS": {
    title: "Symptoms",
  },
  "CIRG-ART-ADHERENCE": {
    title: "ART Adherence",
  },
  "CIRG-Concurrent-Drug-Use": {
    title: "Concurrent Drug Use",
  },
  "CIRG-SEXUAL-RISK": {
    title: "Sexual Risk",
  },
  "CIRG-Alcohol-Use": {
    title: "Alcohol Score",
    scoringParams: { minimumScore: 0, maximumScore: 45, highSeverityScoreCutoff: 35 },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 45, xLabel: "" },
  },
  "CIRG-UNPROTECTED-SEX": {
    title: "Unprotected Sex",
  },
  "CIRG-EXCHANGE-SEX": {
    title: "Exchange Sex",
  },
  "CIRG-STI": {
    title: "STI",
  },
  "CIRG-PSYCHOSOCIAL-CONCERNS": {
    title: "Psychosocial Concerns",
  },
  "CIRG-SOCIAL-SUPPORT": {
    title: "Social Support",
  },
  "CIRG-Mini-Score": {
    title: "MINI Score",
    scoringParams: { minimumScore: 0, maximumScore: 5, highSeverityScoreCutoff: 4 },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 5, xLabel: "" },
  },
  // add others as needed…
};

const getInstrumentDefault = (key) => {
  if (INSTRUMENT_DEFAULTS[key]) return INSTRUMENT_DEFAULTS[key];
  if (questionnaireConfigs[key])
    return {
      ...questionnaireConfigs[key],
      scoringParams: { ...(questionnaireConfigs[key].scoringParams ?? {}), ...questionnaireConfigs[key] },
      chartParams: questionnaireConfigs[key].chartParams ?? {},
    };
};
const normalizeParams = (params = {}) => {
  const scoring = params.scoringParams ?? {};
  const chart = params.chartParams ?? {};
  const chartWithCutoff =
    chart.highSeverityScoreCutoff == null
      ? { ...chart, highSeverityScoreCutoff: scoring.highSeverityScoreCutoff }
      : chart;
  return { ...params, scoringParams: scoring, chartParams: chartWithCutoff };
};

export function buildReportConfig(baseConfig) {
  const out = {
    ...baseConfig,
    sections: baseConfig.sections?.map((section) => {
      const nextSection = {
        ...section,
        tables: section.tables?.map((table) => {
          const keys = table.dataKeysToMatch ?? (table.keyToMatch ? [table.keyToMatch] : []);
          const paramsByKey = { ...(table.paramsByKey ?? {}) };

          keys.forEach((key) => {
            const defaults = getInstrumentDefault(key) || {};
            const current = paramsByKey[key] || {};
            paramsByKey[key] = normalizeParams(deepMerge(defaults, current));
          });

          return { ...table, paramsByKey };
        }),
      };
      return nextSection;
    }),
  };

  return out;
}

export const report_config_base = {
  sections: [
    {
      id: "section_urgent-basic-needs",
      title: "Urgent and Basic Needs",
      tables: [
        {
          id: "table_urgent_basic_needs_main",
          layout: "two-columns",
          dataKeysToMatch: [
            "CIRG-PHQ9",
            "CIRG-PHQ9-SI",
            "CIRG-CNICS-IPV4",
            "CIRG-Overdose",
            "CIRG-Food-Security",
            "CIRG-Financial-Situation",
          ],
          paramsByKey: {
            "CIRG-PHQ9-SI": {
              getProcessedData: (summaryData) => {
                const HOST_ID = "CIRG-PHQ9"; // where the SI answer lives
                const SELF_ID = "CIRG-PHQ9-SI"; // instrument defaults to use

                const host = summaryData?.[HOST_ID];
                if (!host || isEmptyArray(host?.responseData)) return null;

                const currentReponseData = host.scoringSummaryData;
                const siItem = currentReponseData.responses.find((r) => linkIdEquals(r.id, PHQ9_SI_QUESTION_LINK_ID));
                if (!siItem) return null;

                const score = PHQ9_SI_ANSWER_SCORE_MAPPINGS[String(siItem.answer).toLowerCase()];
                if (!isNumber(score)) return null;

                const { title, scoringParams, chartParams } = getInstrumentDefault(SELF_ID) ?? {};
                const alert = score >= (scoringParams?.highSeverityScoreCutoff ?? Infinity);
                const lastAssessed = currentReponseData.lastAssessed;
                const meaning = siItem.answer;
                const responseData = host.responseData ?? [];
                const yFieldKey = "score";
                const data = chartParams.dataFormatter(
                  responseData
                    .map((entry, index) => {
                      if (isEmptyArray(entry.responses)) return null;
                      const hit = entry.responses.find((o) => linkIdEquals(o.id, PHQ9_SI_QUESTION_LINK_ID));
                      if (!hit) return null;
                      const s = PHQ9_SI_ANSWER_SCORE_MAPPINGS[String(hit.answer).toLowerCase()];
                      if (!isNumber(s)) return null;
                      return {
                        id: entry.key + "_" + SELF_ID + "_" + index,
                        date: entry.date,
                        [yFieldKey]: s,
                        source: entry.source,
                        ...scoringParams,
                      };
                    })
                    .filter((row) => row && isNumber(row[yFieldKey])),
                );
                return {
                  scoringSummaryData: {
                    ...getScoreParamsFromResponses(data),
                    ...scoringParams,
                    key: "CIRG_PHQ9_SI",
                    id: HOST_ID + "_" + host.id + "_" + SELF_ID,
                    scoringParams: {
                      scoreSeverity: alert ? "high" : "normal",
                    },
                    // comparison,
                    instrumentName: title,
                    source: currentReponseData?.source,
                    score,
                    alert,
                    lastAssessed,
                    meaning,
                    totalAnsweredItems: 1,
                  },
                  chartData: {
                    ...chartParams,
                    ...scoringParams,
                    id: "CIRG_PHQ9_SI_CHART",
                    yFieldKey,
                    title,
                    data,
                  },
                };
              },
            },
          },
        },
      ],
    },
    {
      id: "section_symptoms",
      title: "Symptoms",
      tables: [
        {
          id: "table_symptoms-bother",
          layout: "simple",
          dataKeysToMatch: ["CIRG-SYMPTOMS"],
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "title",
              headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
            },
            {
              id: "bothersALot",
              header: "Bothers a lot",
              align: "right",
              accessor: "bothersALot",
              renderCell: (row, value) => (
                <Stack direction={"column"} spacing={1}>
                  <span>{value ?? "N/A"}</span>
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
            {
              id: "bothersSome",
              header: "Bothers some",
              align: "right",
              accessor: "bothersSome",
              renderCell: (row, value) => (
                <Stack direction={"column"} spacing={1}>
                  <span>{value ?? "N/A"}</span>
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
          ],
        },
      ],
    },

    {
      id: "section_health_behaviors",
      title: "Health Behavior",
      tables: [
        {
          id: "table_art_adherence",
          layout: "simple",
          dataKeysToMatch: ["CIRG-ART-ADHERENCE"],
          title: "ART Adherence",
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "title",
              type: "text",
              headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
            },
            {
              id: "lastMissedDose",
              header: "Last Missed Dose",
              align: "left",
              accessor: "lastMissedDose",
              type: "text",
            },
          ],
        },
        {
          id: "table_substance_use",
          keyToMatch: "CIRG-SUBSTANCE-USE",
          title: "Substance Use",
          layout: "two-columns",
          dataKeysToMatch: ["CIRG-Nicotine-Use", "CIRG-Alcohol-Use", "CIRG-Mini-Score", "CIRG-Concurrent-Drug-Use"],
        },
      ],
    },
    {
      id: "section_sexual_risks",
      title: "Sexual Risk Behavior",
      tables: [
        {
          id: "table_sexual_risk",
          layout: "simple",
          title: "Sexual Risk Behavior",
          dataKeysToMatch: ["CIRG-SEXUAL-RISK", "CIRG-UNPROTECTED-SEX", "CIRG-EXCHANGE-SEX", "CIRG-STI"],
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "title",
              type: "text",
              headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
            },
            {
              id: "result",
              header: "Result",
              align: "left",
              accessor: "result",
              type: "text",
            },
            {
              id: "date",
              header: "Last Done",
              align: "left",
              accessor: "date",
              type: "text",
              renderCell: (row, value) => (
                <Stack direction={"column"} spacing={1}>
                  <span>{value ?? "N/A"}</span>
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
          ],
        },
      ],
    },
    {
      id: "section_psychosocial_concerns",
      title: "Psychosocial concerns and quality of life",
      tables: [
        {
          id: "table_psychosocial_concern",
          layout: "simple",
          dataKeysToMatch: ["CIRG-PSYCHOSOCIAL-CONCERNS", "CIRG-SOCIAL-SUPPORT"],
          title: "Psychosocial Concerns and Quality of Life",
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "title",
              type: "text",
              headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
            },
            {
              id: "result",
              header: "Result",
              align: "left",
              accessor: "result",
              type: "text",
            },
            {
              id: "date",
              header: "Last Done",
              align: "left",
              accessor: "date",
              type: "text",
              renderCell: (row, value) => (
                <Stack direction={"column"} spacing={1}>
                  <span>{value ?? "N/A"}</span>
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
          ],
        },
      ],
    },
  ],
};

export const report_config = buildReportConfig(report_config_base);
export default report_config;
