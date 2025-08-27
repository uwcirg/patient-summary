import { describe, it, expect } from "vitest";
import { buildScoringSummaryRows } from "../../models/resultBuilders/helpers";
import { makeScoringSummaryDataFixture } from "../fixtures/scoringSummaryData.fixture";

describe("buildScoringSummaryRows with realistic fixture", () => {
  it("shapes rows for all instruments and computes comparison correctly", () => {
    const summaryData = makeScoringSummaryDataFixture();

    const rows = buildScoringSummaryRows(summaryData, {
      formatDate: (iso) => (iso ? new Date(iso).toISOString().split("T")[0] : null),
      instrumentNameByKey: (key, q) => q?.shortName || q?.displayName || key,
    });

    // Basic expectations
    expect(rows).toEqual(expect.any(Array));
    expect(rows.find((r) => r.key === "PHQ9")).toBeTruthy();
    expect(rows.find((r) => r.key === "GAD7")).toBeTruthy();
    expect(rows.find((r) => r.key === "MINICOG")).toBeTruthy();
    expect(rows.find((r) => r.key === "EMPTY_FORM")).toBeTruthy();
    expect(rows.find((r) => r.key === "NO_QUESTIONNAIRE_META")).toBeTruthy();

    // PHQ-9: newest score 12 vs previous 8 -> comparison "higher"
    const phq9 = rows.find((r) => r.key === "PHQ9");
    expect(phq9.score).toBe(12);
    expect(phq9.comparison).toBe("higher");
    expect(phq9.maxScore).toBe(27);
    expect(phq9.lastAssessed).toBe("2025-08-15");

    // GAD-7: single response, no comparison
    const gad7 = rows.find((r) => r.key === "GAD7");
    expect(gad7.score).toBe(5);
    expect(gad7.comparison).toBeNull();
    expect(gad7.totalAnswered).toBe(6);
    expect(gad7.totalItems).toBe(7);

    // Mini-Cog: newest 4 vs previous 3 -> "higher"
    const minicog = rows.find((r) => r.key === "MINICOG");
    expect(minicog.score).toBe(4);
    expect(minicog.comparison).toBe("higher");
    // No scoringParams on newest -> min defaults to 0; max null
    expect(minicog.minScore).toBe(0);
    expect(minicog.maxScore).toBeNull();

    // EMPTY_FORM: no responses -> many nulls/empties
    const empty = rows.find((r) => r.key === "EMPTY_FORM");
    expect(empty.lastAssessed).toBeNull();
    expect(empty.score).toBeNull();
    expect(empty.comparison).toBeNull();

    // NO_QUESTIONNAIRE_META: instrumentName falls back to key
    const noMeta = rows.find((r) => r.key === "NO_QUESTIONNAIRE_META");
    expect(noMeta.instrumentName).toBe("NO_QUESTIONNAIRE_META");
    expect(noMeta.score).toBe(7);
    expect(noMeta.maxScore).toBe(10);
  });
});
