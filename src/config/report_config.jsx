import { Stack } from "@mui/material";
import { linkIdEquals } from "@util/fhirUtil";
import { PHQ9_SI_ANSWER_SCORE_MAPPINGS, PHQ9_SI_QUESTION_LINK_ID } from "@consts";
import { isEmptyArray, isNumber, deepMerge } from "@util";
import CHART_CONFIG from "./chart_config";
import { getScoreParamsFromResponses } from "@/models/resultBuilders/helpers";

export const INSTRUMENT_DEFAULTS = {
  "CIRG-PHQ9": {
    title: "PHQ-9",
    scoringParams: { minimumScore: 0, maximumScore: 27, highSeverityScoreCutoff: 20, comparisonToAlert: "higher" },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 27, xLabel: "" },
  },
  "CIRG-PHQ9-SI": {
    title: "Suicide Ideation",
    scoringParams: { minimumScore: 0, maximumScore: 3, highSeverityScoreCutoff: 3, comparisonToAlert: "higher" },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 3, xLabel: "" },
  },
  "CIRG-Alcohol-Use": {
    title: "Alcohol Score",
    scoringParams: { minimumScore: 0, maximumScore: 45, highSeverityScoreCutoff: 35 },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 45, xLabel: "" },
  },
  "CIRG-Mini-Score": {
    title: "MINI-Score",
    scoringParams: { minimumScore: 0, maximumScore: 5, highSeverityScoreCutoff: 4 },
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 5, xLabel: "" },
  },
  // add others as needed…
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
  // DO NOT JSON-clone; create a new object while preserving functions
  const out = {
    ...baseConfig,
    sections: baseConfig.sections?.map((section) => {
      const nextSection = {
        ...section,
        tables: section.tables?.map((table) => {
          const keys = table.dataKeysToMatch ?? (table.keyToMatch ? [table.keyToMatch] : []);
          const paramsByKey = { ...(table.paramsByKey ?? {}) };

          keys.forEach((key) => {
            const defaults = INSTRUMENT_DEFAULTS[key] || {};
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
          id: "table_urgent-basic-needs-main",
          layout: "two-columns",
          dataKeysToMatch: [
            "CIRG-PHQ9",
            "CIRG-PHQ9-SI",
            "CIRG-IPV",
            "CIRG-Overdose",
            "CIRG-Food-Security",
            "CIRG-Financial-Situation",
          ],
          paramsByKey: {
            // Only overrides unique to this table:
            "CIRG-PHQ9": {
              chartParams: { title: "PHQ-9", xLabel: "" }, // (already the same as defaults; you can omit entirely)
            },
            "CIRG-PHQ9-SI": {
              getProcessedData: (summaryData) => {
                const HOST_ID = "CIRG-PHQ9"; // where the SI answer lives
                const SELF_ID = "CIRG-PHQ9-SI"; // instrument defaults to use

                const host = summaryData?.[HOST_ID]?.scoringSummaryData;
                if (!host || isEmptyArray(host.responses)) return null;

                const siItem = host.responses.find((r) => linkIdEquals(r.id, PHQ9_SI_QUESTION_LINK_ID));
                if (!siItem) return null;

                const score = PHQ9_SI_ANSWER_SCORE_MAPPINGS[String(siItem.answer).toLowerCase()];
                if (!isNumber(score)) return null;

                const { title, scoringParams, chartParams } = INSTRUMENT_DEFAULTS[SELF_ID] ?? {};
                const alert = score >= (scoringParams?.highSeverityScoreCutoff ?? Infinity);
                const lastAssessed = host.lastAssessed;
                const meaning = siItem.answer;
                const responseData = host.responseData ?? [];
                const yFieldKey = "score";
                const data = chartParams.dataFormatter(
                  responseData
                    .map((entry) => {
                      if (isEmptyArray(entry.responses)) return null;
                      const hit = entry.responses.find((o) => linkIdEquals(o.id, PHQ9_SI_QUESTION_LINK_ID));
                      if (!hit) return null;
                      const s = PHQ9_SI_ANSWER_SCORE_MAPPINGS[String(hit.answer).toLowerCase()];
                      if (!isNumber(s)) return null;
                      return { date: entry.date, [yFieldKey]: s, source: entry.source, ...scoringParams, };
                    })
                    .filter((row) => row && isNumber(row[yFieldKey])),
                );
                return {
                  scoringSummaryData: {
                    ...getScoreParamsFromResponses(data),
                    ...scoringParams,
                    key: "CIRG_PHQ9_SI",
                    scoringParams: {
                      scoreSeverity: alert ? "high" : "normal",
                    },
                   // comparison,
                    instrumentName: title,
                    source: host?.source,
                    score,
                    alert,
                    lastAssessed,
                    meaning,
                    totalAnswered: 1,
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
          dataKeysToMatch: ["CIRG_SYMPTOMS"],
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "measure",
              headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
            },
            { id: "bothersALot", header: "Bothers a lot", align: "right", accessor: "bothersALot" },
            { id: "bothersSome", header: "Bothers some", align: "right", accessor: "bothersSome" },
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
          dataKeysToMatch: ["CIRG_ART_ADHERENCE"],
          title: "ART Adherence",
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "measure",
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
          keyToMatch: "CIRG_SUBSTANCE_USE",
          title: "Substance Use",
          layout: "two-columns",
          dataKeysToMatch: ["CIRG-Nicotine-Use", "CIRG-Alcohol-Use", "CIRG-Mini-Score", "CIRG-Concurrent-Drug-Use"],
          paramsByKey: {
            "CIRG-Alcohol-Use": {
              chartParams: { xLabel: "" }, // title/min/max/cutoff come from defaults
            },
            "CIRG-Mini-Score": {
              chartParams: { xLabel: "" },
            },
          },
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
          dataKeysToMatch: ["CIRG_SEXUAL_RISK", "CIRG_UNPROTECTED_SEX","CIRG_EXCHANGE_SEX", "CIRG_STI"],
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "measure",
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
                  <span>{value ?? "--"}</span>
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
          ],
        }
      ]
    },
    {
      id: "section_psychosocial_concerns",
      title: "Psychosocial concerns and quality of life",
      tables: [
         {
          id: "table_psychosocial_concern",
          layout: "simple",
          dataKeysToMatch: ["CIRG_PSYCHOSOCIAL_CONCERNS", "CIRG_SOCIAL_SUPPORT"],
          title: "Psychosocial Concerns and Quality of Life",
          hiddenColumns: ["id", "source", "lastAssessed", "score", "numAnswered", "meaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "measure",
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
                  <span>{value ?? "--"}</span>
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
          ],
        },
      ]
    }
  ],
};

export const report_config = buildReportConfig(report_config_base);
export default report_config;
