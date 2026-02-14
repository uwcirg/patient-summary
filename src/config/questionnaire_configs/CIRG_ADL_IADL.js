import { BASE_CONFIG } from "@config/questionnaire_config_helpers";
export default {
  ...BASE_CONFIG,
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
};
