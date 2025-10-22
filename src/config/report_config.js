import CHART_CONFIG from "./chart_config";

export default {
  sections: [
    {
      id: "urgent-basic-needs",
      title: "URGENT AND BASIC NEEDS",
      layout: "full",
      tables: [
        {
          id: "urgent-basic-needs-main",
          columns: [
            { field: "measure", headername: "Measure", type: "text" },
            { field: "score", headername: "Score/Result", type: "text" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            {
              key: "CIRG-PHQ9",
              comparison: "equal",
              comparisonToAlert: "higher",
              instrumentName: "PHQ-9",
              lastAssessed: "5/11/2025",
              maxScore: 27,
              meaning: "severe depression",
              score: 23,
              scoringParams: {
                maximumScore: 27,
                minimumScore: 24,
                highScore: 20,
                scoreSeverity: "high"
              },
              totalAnswered: 9,
              totalItems: 9,
              chartData: {
                ...CHART_CONFIG.default,
                maximumScore: 27,
                minimumScore: 24,
                highScore: 20,
                chartHeight: 250,
                xLabel: "",
                id: "PHQ9_Chart",
                title: "PHQ9",
                data: CHART_CONFIG.default.dataFormatter([
                  {
                    date: "2025-05-11",
                    total: 23,
                  },
                  {
                    date: "2024-09-11",
                    total: 23,
                  },
                   {
                    date: "2023-08-08",
                    total: 12,
                  },
                  {
                    date: "2023-08-08",
                    total: 16,
                  },
                ]),
              },
            },
            {
              key: "CIRG-PHQ9-SI",
              comparison: "higher",
              comparisonToAlert: "",
              instrumentName: "Suicide Ideation",
              lastAssessed: "5/11/2025",
              maxScore: 3,
              meaning: "Nearly Every Day",
              minScore: 0,
              score: 3,
              scoringParams: {
                maximumScore: 3,
                minimumScore: 1,
                scoreSeverity: "high",
                highScore: 3

              },
              totalAnswered: 1,
              totalItems: 1,
              chartData: {
                ...CHART_CONFIG.default,
                id: "PHQ_SI_CHART",
                 title: "Suicide Ideation",
                maximumScore: 3,
                minimumScore: 1,
                highScore: 3,
                xLabel: "",
                data: CHART_CONFIG.default.dataFormatter([
                  {
                    date: "2025-05-11",
                    total: 3,
                  },
                  {
                    date: "2024-09-11",
                    total: 2,
                  },
                   {
                    date: "2023-08-08",
                    total: 2,
                  },
                ]),
              },
            },
            {
              key: "CIRG-Overdose",
              comparison: "",
              comparisonToAlert: "",
              instrumentName: "Overdose (recent)",
              lastAssessed: "5/11/2025",
              meaning: "--",
              text: "Yes",
              totalAnswered: 1,
              totalItems: 1,
            },
            {
              key: "CIRG-IPV",
              comparison: "",
              comparisonToAlert: "",
              instrumentName: "IPV (past year)",
              lastAssessed: "5/11/2025",
              meaning: "--",
              text: "No",
              totalAnswered: 1,
              totalItems: 1,
            },
            {
              key: "CIRG-Food-Security",
              comparison: "",
              comparisonToAlert: "",
              instrumentName: "Food Security",
              lastAssessed: "5/11/2025",
              meaning: "--",
              text: "Very Low Food Security",
              totalAnswered: 1,
              totalItems: 1,
            },
            {
              key: "CIRG-Financial-Situation",
              comparison: "",
              comparisonToAlert: "",
              instrumentName: "Financial Situation",
              lastAssessed: "5/11/2025",
              meaning: "--",
              text: "Struggling to Survive",
              totalAnswered: 1,
              totalItems: 1,
            },
          ],
        },
      ],
    },
  ],
};
