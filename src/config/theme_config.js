import { createTheme } from "@mui/material/styles";
import { teal, grey, deepPurple} from "@mui/material/colors";
import { getEnv } from "../util/util";
export const themes = {
  default: createTheme({
    palette: {
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
    },
    typography: {
      subtitle1: {
        fontWeight: 500,
      },
    },
  }),
  dcw: createTheme({
    palette: {
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
        main: deepPurple[800]
      }
    },
    typography: {
      subtitle1: {
        fontWeight: 500,
      },
    },
  }),
  //project dependent theme here
};
export const getTheme = () => {
  const projectId = getEnv("REACT_APP_PROJECT_ID");
  return themes[String(projectId).toLowerCase()] || themes["default"];
};
