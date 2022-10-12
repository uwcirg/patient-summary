import { createTheme } from "@mui/material/styles";
import { teal, grey } from "@mui/material/colors";
import { getEnv } from "../util/util";
export const themes = {
  default: createTheme({
    palette: {
      lighter: {
        main: teal[100],
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
  //project dependent theme here
};
export const getTheme = () => {
  const projectId = getEnv("REACT_APP_PROJECT_ID");
  return themes[projectId] || themes["default"];
};
