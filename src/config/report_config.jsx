import { Stack } from "@mui/material";
// import { linkIdEquals } from "@util/fhirUtil";
// import { PHQ9_SI_ANSWER_SCORE_MAPPINGS, PHQ9_SI_QUESTION_LINK_ID } from "@consts";
// import { getQuestionnaireResponseSkeleton } from "@models/resultBuilders/helpers";
import QuestionnaireScoringBuilder from "@models/resultBuilders/QuestionnaireScoringBuilder";
import { deepMerge } from "@util";
import CHART_CONFIG from "./chart_config";
import questionnaireConfigs from "./questionnaire_config";

export const getInstrumentDefaults = () => {
  const keys = Object.keys(questionnaireConfigs);
  return keys.map((key) => {
    return questionnaireConfigs[key];
  });
};

export const INSTRUMENT_DEFAULTS = {
  ...getInstrumentDefaults(),
  "CIRG-Fall-Risk": {
    title: "Fall Risk",
  },
  "CIRG-Shortness-of-Breath": {
    title: "Shortness of breath",
  },
  "CIRG-SYMPTOMS": {
    title: "Symptoms",
  },
  "CIRG-SRS": {
    title: "Self Rating Scale (SRS)",
  },
  "CIRG-Last-Missed-Dose": {
    title: "Last Missed Dose",
  },
  "CIRG-VAS": {
    title: "VAS",
  },
  "CIRG-Nicotine-Use": {
    title: "Nicotine Use",
  },
  "CIRG-Alcohol-Use": {
    title: "Alcohol Score (Audit)",
    minimumScore: 0,
    maximumScore: 45,
    highSeverityScoreCutoff: 35,
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 45, xLabel: "" },
  },
  "CIRG-Mini-Score": {
    title: "MINI Score",
    minimumScore: 0,
    maximumScore: 5,
    highSeverityScoreCutoff: 4,
    chartParams: { ...CHART_CONFIG.default, minimumYValue: 0, maximumYValue: 5, xLabel: "" },
  },
  "CIRG-Drug-Use": {
    title: "Drug Use",
  },
  "CIRG-CNICS-ASSIST-Polysub": {
    title: "Concurrent Drug Use",
  },
  "CIRG-IDU": {
    title: "IDU",
  },
  "CIRG-Concurrent-IDU": {
    title: "Concurrent IDU",
  },
  "CIRG-Naloxone-Access": {
    title: "Naloxone Access"
  },
  "CIRG-Fentanyl-Strip-Access": {
    title: "Fentanyl Test Strip Access"
  },
  "CIRG-SEXUAL-PARTNERS": {
    title: "# of Sex Partners x 3 months",
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
  "CIRG-SOCIAL-SUPPORT": {
    title: "Social Support",
  },
  "CIRG-HIV-Stigma": {
    title: "HIV Stigma"
  },
  "CIRG-PC-PTSD-5": {
    title: "PTSD Symptoms"
  },
  "CIRG-HRQOL": {
    title: "HRQOL"
  }
  // add others as needed…
};

const getInstrumentDefault = (key) => {
  if (INSTRUMENT_DEFAULTS[key]) return INSTRUMENT_DEFAULTS[key];
  if (questionnaireConfigs[key])
    return {
      ...questionnaireConfigs[key],
      scoringParams: questionnaireConfigs[key] ?? {},
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
            "CIRG-SI",
            "CIRG-CNICS-IPV4",
            "CIRG-CNICS-ASSIST-OD",
            "CIRG-CNICS-FOOD",
            "CIRG-CNICS-FINANCIAL",
            "CIRG-CNICS-HOUSING",
            "CIRG-Fall-Risk",
            "CIRG-Shortness-of-Breath",
          ],
          paramsByKey: {
            "CIRG-SI": {
              getProcessedData: (opts = {}) => {
                const { summaryData, bundle } = opts;
                const SELF_ID = "CIRG-SI"; // instrument defaults to use
                if (summaryData && summaryData[SELF_ID]) return summaryData[SELF_ID];
                const config = getInstrumentDefault(SELF_ID);
                const qb = new QuestionnaireScoringBuilder(config, bundle);
                const siSummaryData = qb._summariesByQuestionnaireRef(bundle);
                console.log("siSummary ", siSummaryData)
                return siSummaryData;
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
          dataKeysToMatch: ["CIRG-SRS", "CIRG-Last-Missed-Dose", "CIRG-VAS"],
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
          dataKeysToMatch: [
            "CIRG-Nicotine-Use",
            "CIRG-Alcohol-Use",
            "CIRG-Mini-Score",
            "CIRG-Drug-Use",
            "CIRG-CNICS-ASSIST-Polysub",
            "CIRG-IDU",
            "CIRG-Concurrent-IDU",
          ],
        },
      ],
    },
    {
      id: "section_harm_reduction",
      title: "Harm Reduction",
      tables: [
         {
          id: "table_naloxone_access",
          layout: "simple",
          dataKeysToMatch: ["CIRG-Naloxone-Access", "CIRG-Fentanyl-Strip-Access"],
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
      ]
    },
    {
      id: "section_sexual_risks",
      title: "Sexual Risk Behavior",
      tables: [
        {
          id: "table_sexual_risk",
          layout: "simple",
          title: "Sexual Risk Behavior",
          dataKeysToMatch: ["CIRG-SEXUAL-PARTNERS", "CIRG-UNPROTECTED-SEX", "CIRG-EXCHANGE-SEX", "CIRG-STI"],
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
          layout: "two-columns",
          dataKeysToMatch: ["CIRG-SOCIAL-SUPPORT", "CIRG-HIV-Stigma", "CIRG-PC-PTSD-5", "CIRG-HRQOL"],
          title: "Psychosocial Concerns and Quality of Life",
          //hiddenColumns: ["id", "meaning", "comparison"],
          // columns: [
          //   {
          //     id: "measure",
          //     header: "Measure",
          //     align: "left",
          //     accessor: "title",
          //     type: "text",
          //     headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
          //   },
          //   {
          //     id: "result",
          //     header: "Result",
          //     align: "left",
          //     accessor: "score",
          //     type: "text",
          //   },
          //   {
          //     id: "date",
          //     header: "Last Done",
          //     align: "left",
          //     accessor: "date",
          //     type: "date"
          //   },
          // ],
        },
      ],
    },
  ],
};

export const report_config = buildReportConfig(report_config_base);
export default report_config;
