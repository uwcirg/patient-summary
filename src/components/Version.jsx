import React from "react";
import Box from "@mui/material/Box";
import { getEnv } from "@util";
export default function Version() {
  const versionString = getEnv("REACT_APP_VERSION_STRING");
  if (!versionString) return null;
  else
    return (
      <Box
        sx={{ color: "muted.main", fontSize: "0.8em"}}
        className="print-hidden"
      >{`Application version: ${versionString}`}</Box>
    );
}
