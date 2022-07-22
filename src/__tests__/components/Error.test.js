//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Error from "../../components/Error";

test("Renders error", () => {
  render(<Error message={"test element".toString()} />);
  expect(screen.getByText(/test element/i)).toBeInTheDocument();
});
