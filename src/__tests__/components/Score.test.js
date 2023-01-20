//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Score from "../../components/Score";

test("Renders score without score param", () => {
  render(<Score />);
  expect(screen.getByText("--")).toBeInTheDocument();
});

test("Renders score with alert param", () => {
  const { container } = render(
    <Score score={3} scoreParams={{ scoreSeverity: "high" }} />
  );
  const alertIcon = container.querySelector(".alert-icon");
  expect(alertIcon).toBeInTheDocument();
});

test("Renders score without alert param", () => {
  const { container } = render(
    <Score score={3} />
  );
  const alertIcon = container.querySelector(".alert-icon");
  expect(alertIcon).toBeNull();
});

test("Renders score with score of 0", () => {
  render(<Score score={0} />);
  expect(screen.getByText("0")).toBeInTheDocument();
});
