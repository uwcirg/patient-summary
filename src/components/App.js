import FhirClientProvider from "../FhirClientProvider";
import Summary from "./Summary";
import "../style/App.scss";
import {fetchEnvData, getEnvs} from "../util/util";

export default function App() {
  fetchEnvData(); // call this to load environment variables
  console.log("environment variables ", getEnvs());
  return (
    <FhirClientProvider>
      <Summary />
      {/* add other components as needed */}
    </FhirClientProvider>
  );
}
