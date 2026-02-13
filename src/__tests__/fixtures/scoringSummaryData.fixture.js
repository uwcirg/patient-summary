// Helper to make a response item in the same shape the code expects
const mkResp = ({
  date,                       // ISO date string
  score,                      // number
  totalItems = null,          // number | null
  totalAnsweredItems = null,  // number | null
  scoringParams = null,       // { minimumScore?: number, maximumScore?: number } | null
  scoreMeaning = null,        // string | null (e.g., "mild", "moderate")
  comparisonToAlert = "",     // "" | "higher" | "lower" (semantic coloring hint)
  extra = {},                 // any additional properties that will pass through
} = {}) => ({
  date,
  score,
  totalItems,
  totalAnsweredItems,
  scoringParams,
  scoreMeaning,
  comparisonToAlert,
  ...extra,
});

export const scoringSummaryDataFixture = {
  // --- PHQ-9 example: has two responses (newest first when sorted by date) ---
  PHQ9: {
    questionnaire: {
      id: "phq9",
      url: "http://loinc.org/44249-1",
      name: "PHQ-9",
      shortName: "PHQ-9",
      displayName: "PHQ-9 Depression",
    },
    responseData: [
      mkResp({
        date: "2025-08-15T10:30:00Z",
        score: 12,
        totalItems: 9,
        totalAnsweredItems: 9,
        scoringParams: { minimumScore: 0, maximumScore: 27 },
        scoreMeaning: "moderate",
        // If higher is "worse" for PHQ-9, comparisons where score rises could be error-aligned
        comparisonToAlert: "higher",
      }),
      mkResp({
        date: "2025-07-20T08:00:00Z",
        score: 8,
        totalItems: 9,
        totalAnsweredItems: 9,
        scoringParams: { minimumScore: 0, maximumScore: 27 },
        scoreMeaning: "mild",
        comparisonToAlert: "higher",
      }),
    ],
  },

  // --- GAD-7 example: one response only; also demonstrates partial answers ---
  GAD7: {
    questionnaire: {
      id: "gad7",
      url: "http://loinc.org/69730-0",
      name: "GAD-7",
      shortName: "GAD-7",
      displayName: "Generalized Anxiety Disorder 7",
    },
    responseData: [
      mkResp({
        date: "2025-08-10T12:00:00Z",
        score: 5,
        totalItems: 7,
        totalAnsweredItems: 6, // user skipped one item
        scoringParams: { minimumScore: 0, maximumScore: 21 },
        scoreMeaning: "mild",
        comparisonToAlert: "higher",
      }),
    ],
  },

  // --- Mini-Cog example: severity inversion often applies; include three responses ---
  MINICOG: {
    questionnaire: {
      id: "minicog",
      url: "http://example.org/minicog",
      name: "Mini-Cog",
      shortName: "Mini-Cog",
      displayName: "Mini-Cog Cognitive",
    },
    responseData: [
      mkResp({
        date: "2025-08-18T09:15:00Z",
        score: 4, // newer, higher (often "better" for Mini-Cog)
        totalItems: 2,
        totalAnsweredItems: 2,
        // No scoringParams provided here to test selector defaults (min=0, max=null)
        scoreMeaning: "low", // e.g., "unlikely impairment"
        comparisonToAlert: "lower", // "lower is worse" -> higher might be green
      }),
      mkResp({
        date: "2025-08-01T09:15:00Z",
        score: 3,
        totalItems: 2,
        totalAnsweredItems: 2,
        scoringParams: { minimumScore: 0, maximumScore: 5 },
        scoreMeaning: "low",
        comparisonToAlert: "lower",
      }),
      mkResp({
        date: "2025-07-15T09:15:00Z",
        score: 2,
        totalItems: 2,
        totalAnsweredItems: 2,
        scoringParams: { minimumScore: 0, maximumScore: 5 },
        scoreMeaning: "high", // e.g., "possible impairment"
        comparisonToAlert: "lower",
      }),
    ],
  },

  // --- An instrument with empty responses to test empty handling ---
  EMPTY_FORM: {
    questionnaire: {
      id: "empty-123",
      name: "Empty Form",
      shortName: "EMPTY",
      displayName: "Empty Form",
    },
    responseData: [],
  },

  // --- An instrument with missing questionnaire object entirely ---
  NO_QUESTIONNAIRE_META: {
    responseData: [
      mkResp({
        date: "2025-08-05T15:45:00Z",
        score: 7,
        totalItems: 10,
        totalAnsweredItems: 10,
        scoringParams: { minimumScore: 0, maximumScore: 10 },
        scoreMeaning: "moderate",
        comparisonToAlert: "higher",
      }),
    ],
  },
};

// Named helper if want a fresh copy in tests
export const makeScoringSummaryDataFixture = () => JSON.parse(JSON.stringify(scoringSummaryDataFixture));
