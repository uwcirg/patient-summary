import { Box, Stack } from "@mui/material";
import { getNoDataDisplay } from "@models/resultBuilders/helpers";
import { getLocaleDateStringFromDate, isEmptyArray } from "@util";
import ResponsesViewer from "@components/ResponsesViewer";

export const report_config = {
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
            "CIRG-CNICS-FROP-Com",
            "CIRG-Shortness-of-Breath",
          ],
          hiddenColumns: ["numAnswered"],
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
          dataKeysToMatch: ["CIRG-CNICS-Symptoms"],
          hiddenColumns: ["id", "source", "lastAssessed", "numAnswered", "scoreMeaning", "comparison"],
          columns: [
            {
              id: "measure",
              cellProps: {
                sx: {
                  align: "left",
                },
              },
            },
            {
              id: "bothersALot",
              header: "Bothers a lot",
              align: "left",
              accessor: "bothersALot",
              cellProps: {
                sx: { verticalAlign: "top", lineHeight: 1.5 },
              },
              renderCell: (row, value) => (
                <Stack direction={"column"} sx={{ whiteSpace: "pre-line" }} justifyContent={"space-between"}>
                  <Box>{value && value.split(",").join("\n")}</Box>
                  {!value && getNoDataDisplay()}
                  {row.source && (
                    <Box className="muted-text" sx={{ mt: 1 }}>
                      {row.source}
                    </Box>
                  )}
                </Stack>
              ),
            },
            {
              id: "bothersSome",
              header: "Bothers some",
              align: "left",
              accessor: "bothersSome",
              cellProps: {
                sx: { verticalAlign: "top", lineHeight: 1.5 },
              },
              renderCell: (row, value) => (
                <Stack direction={"column"} sx={{ whiteSpace: "pre-line" }} justifyContent={"flex-start"}>
                  <Box>{value && value.split(",").join("\n")}</Box>
                  {!value && getNoDataDisplay()}
                  {row.source && (
                    <Box className="muted-text" sx={{ mt: 1 }}>
                      {row.source}
                    </Box>
                  )}
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
          layout: "two-columns",
          dataKeysToMatch: ["CIRG-SRS", "CIRG-Last-Missed-Dose", "CIRG-VAS"],
          title: "Antiretroviral (ART) Adherence",
          hiddenColumns: ["id", "source", "numAnswered", "scoreMeaning", "comparison"],
          columns: [
            {
              id: "measure",
            },
            {
              id: "result",
              header: "Result",
              align: "left",
              accessor: "result",
              type: "text",
            },
          ],
        },
        {
          id: "table_substance_use",
          keyToMatch: "CIRG-SUBSTANCE-USE",
          title: "Substance Use",
          layout: "two-columns",
          hiddenColumns: ["comparison", "numAnswered"],
          dataKeysToMatch: [
            "CIRG-CNICS-Smoking",
            "CIRG-CNICS-AUDIT",
            "CIRG-CNICS-MINI",
            "CIRG-CNICS-ASSIST",
            //  "CIRG-CNICS-ASSIST-Polysub",
            // "CIRG-IDU",
            // "CIRG-Concurrent-IDU",
          ],
        },
        {
          id: "table_naloxone_access",
          title: "Harm Reduction",
          layout: "simple",
          dataKeysToMatch: ["CIRG-Naloxone-Access", "CIRG-Fentanyl-Strip-Access"],
          hiddenColumns: ["id", "source", "lastAssessed", "numAnswered", "scoreMeaning", "comparison"],
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
                <Stack direction={"column"}>
                  {value && <span>{value}</span>}
                  {!value && getNoDataDisplay()}
                  {row.source && <span className="muted-text">{row.source}</span>}
                </Stack>
              ),
            },
          ],
        },
        {
          id: "table_sexual_risk",
          title: "Sexual Risk Behavior",
          layout: "simple",
          dataKeysToMatch: [
            "CIRG-SEXUAL-PARTNERS",
            "CIRG-PARTNER-CONTEXT",
            "CIRG-CNICS-SEXUAL-RISK",
            // "CIRG-UNPROTECTED-ANAL-SEX",
            // "CIRG-UNPROTECTED-ORAL-SEX",
            // "CIRG-UNPROTECTED-VAGINAL-SEX",
            "CIRG-STI",
            "CIRG-EXCHANGE-SEX",
          ],
          hiddenColumns: ["id", "source", "lastAssessed", "numAnswered", "scoreMeaning", "comparison"],
          columns: [
            {
              id: "measure",
              header: "Measure",
              align: "left",
              accessor: "title",
              type: "text",
              headerProps: { sx: { textAlign: "left", backgroundColor: "lightest.main" } },
              renderCell: (row, value) => {
                if (isEmptyArray(row?.responseData)) return value;
                return (
                  <ResponsesViewer
                    title={row.title}
                    subtitle={row.subtitle}
                    note={row.note}
                    responsesTileTitle={row.rowTitle}
                    tableData={row?.tableResponseData}
                    columns={row?.responseColumns}
                    questionnaire={row.questionnaire}
                    buttonStyle={{ width: "100%", maxWidth: 108 }}
                  />
                );
              },
            },
            {
              id: "result",
              header: "Result",
              align: "left",
              accessor: "result",
              type: "text",
              cellProps: {
                sx: {
                  whiteSpace: "pre",
                },
              },
            },
            {
              id: "date",
              header: "Last Done",
              align: "left",
              accessor: "date",
              type: "text",
              renderCell: (row, value) => (
                <Stack direction={"column"} spacing={1}>
                  {value && <Box>{getLocaleDateStringFromDate(value)}</Box>}
                  {!value && getNoDataDisplay()}
                  {row.source && (
                    <Box className="muted-text" sx={{ mt: 2 }}>
                      {row.source}
                    </Box>
                  )}
                </Stack>
              ),
            },
          ],
        },
        {
          id: "table_psychosocial_concern",
          title: "Psychosocial Concerns and Quality of Life",
          layout: "two-columns",
          hiddenColumns: ["numAnswered", "comparison"],
          dataKeysToMatch: ["CIRG-SOCIAL-SUPPORT", "CIRG-HIV-Stigma", "CIRG-PC-PTSD-5", "CIRG-HRQOL"],
        },
      ],
    },
  ],
};
