import Box from "@mui/material/Box";
import { getEnv } from "../util/util";
export default function Version() {
  const versionString = getEnv("REACT_APP_VERSION_STRING");
  if (!versionString) return null;
  else
    return (
      <Box
        sx={{ marginTop: 2, color: "#777", fontSize: "0.9em"}}
      >{`Version: ${versionString}`}</Box>
    );
}
