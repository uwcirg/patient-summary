import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
import CHART_CONFIG from "@config/chart_config";

export default {
  ...BASE_CONFIG,
  questionnaireId: "CIRG-GDS",
  questionnaireName: "gds",
  instrumentName: "GDS",
  questionnaireUrl: "http://www.cdc.gov/ncbddd/fasd/gds",
  scoringQuestionId: "/48545-8",
  maximumScore: 15,
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
};
