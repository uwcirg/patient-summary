//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Error from "../../components/ErrorComponent";

test("Renders error - with string message", () => {
  render(<Error message={"test element".toString()} />);
  expect(screen.getByText(/test element/i)).toBeInTheDocument();
});
test("Renders error - with object", () => {
  render(<Error message={{"test": "test element"}} />);
  expect(screen.getByText("Error occurred see console for detail")).toBeInTheDocument();
});
