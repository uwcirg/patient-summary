//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ScoringSummary from "../../components/sections/ScoringSummary";
import PHQ9SummaryData from "../mockfiles/MockPHQ9SummaryData.json";


describe("Testing ScoringSummary component", () => {
  it("Renders scoring summary without data", () => {
    render(<ScoringSummary />);
    expect(screen.getByText("No Data")).toBeInTheDocument();
  });

  it("Renders score cell using data as array", () => {
    const { container } = render(<ScoringSummary data={[PHQ9SummaryData.scoringSummaryData]} />);
    const scoreElement = container.querySelector(".score-wrapper");
    const descendant = screen.getByTestId("score");
    expect(scoreElement).toContainElement(descendant);
  });

  it("Renders score cell using data as a single object", () => {
    const { container } = render(<ScoringSummary data={PHQ9SummaryData.scoringSummaryData} />);
    const scoreElement = container.querySelector(".score-wrapper");
    const descendant = screen.getByTestId("score");
    expect(scoreElement).toContainElement(descendant);
  });
});
