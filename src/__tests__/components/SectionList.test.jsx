//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SectionList from "../../components/SectionList";
import DEFAULT_SECTIONS from "../../config/sections_config";

describe("Testing SectionList component", () => {
  it("Renders section list component without list given", () => {
    const { container } = render(<SectionList />);
    const listElement = container.querySelector(".sections-list");
    expect(listElement).toBeNull();
  });

  it("Renders section list component with list given - check default Questionnaire Responses section", () => {
    render(<SectionList list={DEFAULT_SECTIONS} expanded={true} />);
    expect(screen.getByText("Questionnaire Responses")).toBeInTheDocument();
  });

  it.skip("Renders section list component with list given - check default Observations section", () => {
    render(<SectionList list={DEFAULT_SECTIONS} expanded={true} />);
    expect(screen.getByText("Observations")).toBeInTheDocument();
  });
});
