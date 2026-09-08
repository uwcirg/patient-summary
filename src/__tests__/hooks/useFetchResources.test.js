import { describe, it, expect } from "vitest";
import { reducer } from "../../hooks/useFetchResources"; // adjust path if needed

// Minimal initial state for the combined reducer
const mkState = (baseOverrides = {}, loader = []) => ({
  base: {
    questionnaireList: [],
    questionnaires: [],
    questionnaireResponses: [],
    exactMatchById: false,
    summaries: {},
    complete: false,
    error: false,
    errorMessage: "",
    ...baseOverrides,
  },
  loader,
});

describe("combined reducer", () => {
  it("loader scope: UPSERT_MANY", () => {
    const initial = mkState();

    // INIT_TRACKING
    const afterInit = reducer(initial, {
      scope: "loader",
      type: "UPSERT_MANY",
      items: [
        { id: "Questionnaire", title: "Questionnaire", complete: false, error: false },
        { id: "QuestionnaireResponse", title: "QuestionnaireResponse", complete: false, error: false },
        { id: "summaryData", title: "Response Summary Data", complete: false, error: false, data: null },
      ],
    });

    expect(afterInit.loader).toHaveLength(3);
    const qRow = afterInit.loader.find((r) => r.id === "Questionnaire");
    const qrRow = afterInit.loader.find((r) => r.id === "QuestionnaireResponse");
    expect(qRow.complete).toBe(false);
    expect(qrRow.complete).toBe(false);

    // ERROR on Questionnaire
    const afterError = reducer(afterInit, {
      scope: "loader",
      type: "ERROR",
      id: "Questionnaire",
      errorMessage: "boom",
    });

    const qRowErr = afterError.loader.find((r) => r.id === "Questionnaire");
    expect(qRowErr.error).toBe(true);
    expect(qRowErr.complete).toBe(true);
    expect(qRowErr.errorMessage).toBe("boom");

    // COMPLETE on QuestionnaireResponse (with data)
    const afterComplete = reducer(afterError, {
      scope: "loader",
      type: "COMPLETE",
      id: "QuestionnaireResponse",
      data: { count: 42 },
    });

    const qrRowDone = afterComplete.loader.find((r) => r.id === "QuestionnaireResponse");
    expect(qrRowDone.complete).toBe(true);
    expect(qrRowDone.error).toBeFalsy();
    expect(qrRowDone.data).toEqual({ count: 42 });

    // base slice stays untouched the whole time
    expect(afterComplete.base).toEqual(initial.base);
  });

  it("base scope isolation: RESULTS then ERROR, loader unaffected", () => {
    const initial = mkState();

    // RESULTS (base)
    const afterResults = reducer(initial, {
      scope: "base",
      type: "RESULTS",
      questionnaireList: ["phq9"],
      questionnaires: [{ id: "q1" }],
      questionnaireResponses: [{ id: "qr1" }],
      exactMatchById: true,
    });

    expect(afterResults.base.complete).toBe(true);
    expect(afterResults.base.error).toBe(false);
    expect(afterResults.base.questionnaireList).toEqual(["phq9"]);
    expect(afterResults.base.questionnaires).toEqual([{ id: "q1" }]);
    expect(afterResults.base.questionnaireResponses).toEqual([{ id: "qr1" }]);
    // loader not changed
    expect(afterResults.loader).toEqual(initial.loader);

    // ERROR (base)
    const afterError = reducer(afterResults, {
      scope: "base",
      type: "ERROR",
      errorMessage: "nope",
    });

    expect(afterError.base.error).toBe(true);
    expect(afterError.base.errorMessage).toBe("nope");
    // loader still not changed
    expect(afterError.loader).toEqual(initial.loader);
  });
});
