//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Responses from "../../components/Responses";
import PHQ9Data from "../mockfiles/MockPHQ9SummaryData.json";

describe("Testing Summary component", () => {
  it("Renders summary - empty data set", () => {
    render(<Responses data={[]} />);
  });

  it("Render summary - null data", () => {
    render(<Responses data={null} />);
  });

  it("Render summary - no responses data set", () => {
    const badData = [
      {
        date: "2022-07-01",
        responses: null,
      },
    ];
    render(<Responses data={badData}></Responses>);
  });

  it.skip("Render summary - non-empty data set", () => {
    // TODO, figure out why it is bombing out on Material UI button
    render(<Responses data={PHQ9Data} />);
    expect(screen.getByText("View")).toBeInTheDocument();
  });
});
