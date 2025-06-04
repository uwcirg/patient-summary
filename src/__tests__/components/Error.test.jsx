//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Error from "../../components/ErrorComponent";
describe("Testing Error component", () => {
  it("Renders error - with string message", () => {
    render(<Error message={"test element".toString()} />);
    expect(screen.getByText(/test element/i)).toBeInTheDocument();
  });
  it("Renders error - with object", () => {
    render(<Error message={{ test: "test element" }} />);
    expect(
      screen.getByText("Error occurred. See console for detail.")
    ).toBeInTheDocument();
  });
});
