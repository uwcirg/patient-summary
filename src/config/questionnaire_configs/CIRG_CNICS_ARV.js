import { BASE_CONFIG, makeArvDerivedConfig, percentValueFormatter } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  questionnaireId: "CIRG-CNICS-ARV",
  title: "Antiretroviral (ARV) adherence",
  instrumentName: "CIRG-CNICS-ARV",
};

export const CIRG_CNICS_ARV_MISSED_DOSE = makeArvDerivedConfig(
  "ARV-last-missed",
  "Last Missed Dose",
  "Last Missed Dose",
  {
    subtitle: "Past 4 weeks",
  },
);

export const CIRG_CNICS_ARV_SRS = makeArvDerivedConfig(
  "ARV-SRS",
  "Self Rating Scale (SRS)",
  "Self Rating Scale (SRS)",
  {
    subtitle: "Past 4 weeks",
    // NOTE: original had typo in columns linkId ("SARV-SRS" instead of "ARV-SRS") — preserved here
    columns: [{ linkId: "SARV-SRS", id: "result" }],
  },
);

export const CIRG_CNICS_ARV_VAS = {
  ...BASE_CONFIG,
  title: "Percent ART taken",
  subtitle: "Past 4 weeks",
  instrumentName: "VAS",
  scoringQuestionId: "ARV-VAS",
  deriveFrom: {
    hostIds: ["CIRG-CNICS-ARV"],
    linkId: "ARV-VAS",
  },
  columns: [{ linkId: "ARV-VAS", id: "result" }],
  valueFormatter: percentValueFormatter,
  chartParams: {
    ...CHART_CONFIG.default,
    title: "Percent ART Taken",
    minimumYValue: 0,
    maximumYValue: 100,
    xLabel: "",
    yLabel: "value",
    tooltipValueFormatter: percentValueFormatter,
    type: "barchart",
  },
  skipResponses: true,
  meaningRowLabel: "Visual Analog Scale % (Past 4 weeks)",
};
