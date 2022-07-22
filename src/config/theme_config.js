import { createTheme } from "@mui/material/styles";
import { teal } from "@mui/material/colors";
import { getEnv } from "../util/util";
export const themes = {
  default: createTheme({
    palette: {
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
        main: "#4f3606",
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
  const projectId = getEnv("PROJECT_ID");
  return themes[projectId] || themes["default"];
};
