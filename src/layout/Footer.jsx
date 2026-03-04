import DomPurify from "dompurify";
import { indigo } from "@mui/material/colors";
import { Stack, Typography } from "@mui/material";
import { HELP_HTML_TEXT } from "@consts";
import Version from "../components/Version";

export default function Footer() {
  return (
    <Stack
      component="footer"
      alignItems="center"
      justifyContent="space-between"
      gap={0.65}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        py: 1,
        px: 2,
        zIndex: 50,
        backgroundColor: indigo[50],
        boxShadow:
          "0px -2px 1px -1px rgba(0,0,0,0.2),0px -1px 1px 0px rgba(0,0,0,0.14), 0px -1px 3px 0px rgba(0,0,0,0.12)",
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        dangerouslySetInnerHTML={{ __html: DomPurify.sanitize(HELP_HTML_TEXT) }}
      />
      <Version />
    </Stack>
  );
}
