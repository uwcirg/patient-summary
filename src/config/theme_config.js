import { createTheme } from "@mui/material/styles";
import { teal, grey, deepPurple, purple, indigo} from "@mui/material/colors";
import { getEnvProjectId } from "../util/util";
const defaultOptions = {
  zIndex: {
    drawer: 100,
  },
  typography: {
    subtitle1: {
      fontWeight: 500,
    },
  },
};
export const themes = {
  default: createTheme({
    ...defaultOptions,
    palette: {
      background: {
        main: "#f7f6f9",
      },
      lightest: {
        main: "#FFF",
      },
      lighter: {
        main: teal[50],
      },
      light: {
        main: teal[300],
      },
      primary: {
        main: teal[500],
      },
      dark: {
        main: teal[800],
      },
      secondary: {
        main: grey[800],
      },
      link: {
        main: purple[700],
      },
      muted: {
        main: grey[500],
      },
      border: {
        main: "#ececec",
      },
    },
  }),
  dcw: createTheme({
    ...defaultOptions,
    palette: {
      background: {
        main: "#f7f6f9",
      },
      lightest: {
        main: "#f4f1f9",
      },
      lighter: {
        main: deepPurple[50],
      },
      light: {
        main: deepPurple[200],
      },
      primary: {
        main: deepPurple[900],
      },
      dark: {
        main: deepPurple[900],
      },
      secondary: {
        main: grey[800],
      },
      accent: {
        main: deepPurple[800],
      },
      muted: {
        main: grey[700],
      },
      border: {
        main: "#ececec",
      },
      link: {
        main: indigo["A700"],
      },
    },
  }),
  //project dependent theme here
};
export const getTheme = () => {
  const projectId = getEnvProjectId();
  return themes[String(projectId).toLowerCase()] || themes["default"];
};
