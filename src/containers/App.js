import Dashboard from "../components/Dashboard";
import TimeoutModal from "../components/TimeoutModal";
import Base from "../layout/Base";

export default function App() {
  return (
    <Base>
      <Dashboard />
      <TimeoutModal />
    </Base>
  );
}
