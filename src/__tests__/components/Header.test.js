//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Header from "../../layout/Header";

test("Renders header", () => {
  const {container} = render(<Header />);
  const headerElement = container.querySelector("header");
  expect(headerElement).toBeDefined();
});

test("Header - return url button", () => {
  render(<Header returnURL="test.com"/>);
  expect(screen.getByText("Patient List")).toBeInTheDocument();
});

test("Header - without return url", () => {
  const { container } = render(<Header />);
  const returnButton = container.querySelector(".btn-return-url");
  expect(returnButton).toBeNull();
});
