import React from "react";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import Dashboard from "../components/Dashboard";
import TimeoutModal from "../components/TimeoutModal";
import Base from "../layout";

export default function App() {
  return (
    <Base>
      <Dashboard />
      <TimeoutModal />
    </Base>
  );
}
