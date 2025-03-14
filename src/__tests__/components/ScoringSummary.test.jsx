//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ScoringSummary from "../../components/sections/ScoringSummary";
import summaryData from "../mockfiles/MockSummaryData.json";
import summaryData2 from "../mockfiles/MockSummaryData2.json";

describe("Testing ScoringSummary component", () => {
  it("Renders scoring summary without data", () => {
    render(<ScoringSummary />);
    expect(screen.getByText("No summary available")).toBeInTheDocument();
  });

  it("Renders scoring summary with data", () => {
    const { container } = render(<ScoringSummary summaryData={summaryData} />);
    const tableElement = container.querySelector(".scoring-summary-table");
    expect(tableElement).toBeInTheDocument();
  });

  it("Renders score cell", () => {
    const { container } = render(<ScoringSummary summaryData={summaryData2} />);
    const scoreElement = container.querySelector(".score-cell");
    const descendant = screen.getByTestId("score");
    expect(scoreElement).toContainElement(descendant);
  });
});
