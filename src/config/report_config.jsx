import { Box, Stack } from "@mui/material";
import {getNoDataDisplay} from "@models/resultBuilders/helpers";

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
              formatter: (row, value) => row.key === "CIRG-VAS" && value? value + " %" : value
            },
          ],
        },
        {
          id: "table_substance_use",
          keyToMatch: "CIRG-SUBSTANCE-USE",
          title: "Substance Use",
          layout: "two-columns",
          hiddenColumns: ["comparison"],
          dataKeysToMatch: [
            "CIRG-CNICS-Smoking",
            "CIRG-CNICS-AUDIT",
            "CIRG-CNICS-MINI",
            "CIRG-Drug-Use",
            "CIRG-CNICS-ASSIST-Polysub",
            "CIRG-IDU",
            "CIRG-Concurrent-IDU",
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
          dataKeysToMatch: ["CIRG-SEXUAL-PARTNERS", "CIRG-UNPROTECTED-SEX", "CIRG-EXCHANGE-SEX", "CIRG-STI"],
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
                <Stack direction={"column"} spacing={1}>
                  {value && <Box>{value}</Box>}
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
          title: "Psychosocial concerns and quality of life",
          layout: "two-columns",
          dataKeysToMatch: ["CIRG-SOCIAL-SUPPORT", "CIRG-HIV-Stigma", "CIRG-PC-PTSD-5", "CIRG-HRQOL"],
        },
      ],
    },
  ],
};
