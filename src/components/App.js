// import { ErrorBoundary } from "react-error-boundary";
// import { QueryClient, QueryClientProvider } from "react-query";
// import {useLayoutEffect} from "react";
// import CssBaseline from "@mui/material/CssBaseline";
// import { ThemeProvider } from "@mui/material/styles";
// import Alert from "@mui/material/Alert";
// import AlertTitle from "@mui/material/AlertTitle";
// import FhirClientProvider from "../context/FhirClientProvider";
import Summaries from "./Summaries";
import TimeoutModal from "./TimeoutModal";
// import { getTheme } from "../config/theme_config";
// import "../style/App.scss";
import Base from "./Base";

// function ErrorFallBack({ error }) {
//   return (
//     <Alert severity="error">
//       <AlertTitle>Something went wrong:</AlertTitle>
//       <pre>{error.message}</pre>
//       <p>Refresh page and try again</p>
//     </Alert>
//   );
// }
// const queryClient = new QueryClient();

export default function App() {
  return (
    <Base>
      <Summaries />
      <TimeoutModal />
    </Base>
  );
}
