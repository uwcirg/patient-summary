import { makeEuroqolDerivedConfig, percentValueFormatter } from "../questionnaire_config_helpers";
export default {
  instrumentName: "HRQOL",
  title: "EuroQOL Health Related Quality-of-Life questionnaire",
};

export const CIRG_CNICS_EUROQOL_ANXIETY_DEPRESSION = makeEuroqolDerivedConfig(
  "EUROQOL-SCORE-ANXIETY-DEPRESSION",
  "Anxiety/Depression",
  "EUROQOL: Anxiety/Depression",
);
export const CIRG_CNICS_EUROQOL_EUROQOL_5 = makeEuroqolDerivedConfig(
  "EUROQOL-5",
  "Overall Health State",
  "EUROQOL: Overall health state (0% - 100%)",
  {
    instrumentName: "CIRG-CNICS-EUROQOL-EUROQOL-5",
    subtitle: "( 0% - 100% )",
    valueFormatter: percentValueFormatter,
  },
);

export const CIRG_CNICS_EUROQOL_PAIN_DISCOMFORT = makeEuroqolDerivedConfig(
  "EUROQOL-SCORE-PAIN",
  "Pain/Discomfort",
  "EUROQOL: Pain/Discomfort",
);

export const CIRG_CNICS_EUROQOL_SELF_CARE = makeEuroqolDerivedConfig(
  "EUROQOL-SCORE-SELF-CARE",
  "Self Care",
  "EUROQOL: Self Care",
);

export const CIRG_CNICS_EUROQOL_USUAL_ACTIVITIES = makeEuroqolDerivedConfig(
  "EUROQOL-SCORE-USUAL-ACTIVITIES",
  "Usual Activities",
  "EUROQOL: Usual Activities",
);
