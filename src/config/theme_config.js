import { createTheme } from "@mui/material/styles";
import { grey, deepPurple, blue, indigo, orange} from "@mui/material/colors";
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
        main: "#f7f7f8",
      },
      lighter: {
        main: indigo[50],
      },
      light: {
        main: indigo[300],
      },
      primary: {
        main: indigo[800],
      },
      accent: {
        main: orange[900]
      },
      dark: {
        main: indigo[900],
      },
      secondary: {
        main: grey[800],
      },
      link: {
        main: blue[700],
      },
      muted: {
        main: grey[700],
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
