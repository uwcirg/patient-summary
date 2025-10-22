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
            { field: "measure", headername: "Measure", type: "text"},
            { field: "score", headername: "Score/Result", type: "text" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            { id: 1, measureId: "FALL_RISK", measure: "Fall risk", score:"", date: "" },
            { id: 2, measureId: "FINANCIAL_SITUATION", measure: "Financial situation", score: "", date: "" },
            { id: 3, measureId: "FOOD_SECURITY", measure: "Food security", score: "", date: "" },
            { id: 4, measureId: "HOUSING_STATUS", measure: "Housing", score: "", date: ""},
            { id: 5, measureId: "IPV_PAST_YEAR", measure: "IPV (past year)", score: "", date: "" },
            { id: 6, measureId: "OVERDOSE_RECENT", measure: "Overdose (recent)", score: "", date: "" },
            { id: 7, measureId: "PHQ9", measure: "PHQ-9" , score: "", date: ""},
            { id: 8, measureId: "PHQ9_ITEM9", measure: "Suicidal ideation",score: "", date: "" },
            { id: 9, measureId: "SOB", measure: "Shortness of breath", score: "", date: "" },
          ],
        },
      ],
    },

    {
      id: "symptoms",
      title: "SYMPTOMS",
      layout: "two-column",
      tables: [
        {
          id: "symptoms-bother",
          columns: [
            { field: "measure", headername: "", type: "text" },
            { field: "bothersALot", headername: "Bothers a lot", type: "boolean", align: "center" },
            { field: "bothersSome", headername: "Bothers some", type: "boolean", align: "center" },
          ],
          rows: [
            { id: 1, measureId: "PAIN_BOTHER", measure: "Pain", score: "", date: "" },
            { id: 2, measureId: "SLEEP_BOTHER", measure: "Sleep", score: "", date: "" },
          ],
        },
      ],
    },

    {
      id: "health-behaviors",
      title: "HEALTH BEHAVIORS",
      layout: "full",
      tables: [
        {
          id: "art-adherence",
          title: "ART adherence",
          columns: [
            { field: "measure", headername: "Measure" },
            { field: "score", headername: "Score/Result" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            { id: 1, measureId: "ART_LAST_MISSED", measure: "Last Missed Dose" },
            { id: 2, measureId: "ART_SRS", measure: "Self Rating Scale (SRS)" },
            { id: 3, measureId: "ART_VAS", measure: "VAS" },
          ],
        },

        {
          id: "substance-use",
          title: "Substance use",
          columns: [
            { field: "measure", headername: "Measure" },
            { field: "score", headername: "Score/Result" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            { id: 1, measureId: "ALCOHOL_USE", measure: "Alcohol use (AUDIT, MINI)" },
            { id: 2, measureId: "DRUG_CONCURRENT", measure: "Concurrent drug use*", note: "*" },
            { id: 3, measureId: "DRUG_USE_ANY", measure: "Drug use*", note: "*" },
            { id: 4, measureId: "IDU_CONCURRENT", measure: "Concurrent IDU*", note: "*" },
            { id: 5, measureId: "IDU_FREQ", measure: "IDU and frequency of IDU*", note: "*" },
            { id: 6, measureId: "NICOTINE_USE", measure: "Nicotine use" },
          ],
        },

        {
          id: "harm-reduction",
          title: "Harm reduction",
          columns: [
            { field: "measure", headername: "Measure" },
            { field: "score", headername: "Score/Result" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            { id: 1, measureId: "FTS_ACCESS", measure: "Fentanyl test strip access" },
            { id: 2, measureId: "NALOXONE_ACCESS", measure: "Naloxone access" },
          ],
        },

        {
          id: "sexual-risk",
          title: "Sexual risk behavior*",
          columns: [
            { field: "measure", headername: "Measure" },
            { field: "score", headername: "Score/Result" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            { id: 1, measureId: "EXCHANGE_SEX", measure: "Exchange sex (recent)" },
            { id: 2, measureId: "SEX_PARTNERS_3M", measure: "# of sex partners X 3 mos" },
            { id: 3, measureId: "STI_CONCERN", measure: "Concern for STI" },
            { id: 4, measureId: "UNPROTECTED_SEX", measure: "Unprotected sex" },
          ],
        },
      ],
    },

    {
      id: "psychosocial-qol",
      title: "Psychosocial concerns and quality of life",
      layout: "full",
      tables: [
        {
          id: "psychosocial-qol-main",
          columns: [
            { field: "measure", headername: "Measure" },
            { field: "score", headername: "Score/result" },
            { field: "date", headername: "Most recent PRO date", type: "date", format: "YYYY-MM-DD", align: "right" },
          ],
          rows: [
            { id: 1, measureId: "HIV_STIGMA", measure: "HIV stigma" },
            { id: 2, measureId: "HRQOL", measure: "HRQOL" },
            { id: 3, measureId: "MAPSS_SF", measure: "Social support (MAPSS-SF)" },
            { id: 4, measureId: "PC_PTSD", measure: "PTSD symptoms (PC-PTSD)" },
          ],
        },
      ],
    },
  ],
};
