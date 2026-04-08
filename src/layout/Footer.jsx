import DomPurify from "dompurify";
import { Stack, Typography } from "@mui/material";
import { getEnvHelpEmail } from "@util";
import Version from "../components/Version";

export default function Footer() {
  const HELP_HTML_TEXT = `If you have questions about this system, email Bill Lober MD, MS at <a href="mailto:${getEnvHelpEmail()}">${getEnvHelpEmail()}</a>.`;
  return (
    <Stack
      component="footer"
      alignItems="center"
      justifyContent="space-between"
      gap={0.5}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        pt: 0.5,
        pb: 0.5,
        px: 2,
        zIndex: 50,
        backgroundColor: (theme) => theme.palette.lighter.main,
        boxShadow:
          "0px -2px 1px -1px rgba(0,0,0,0.2),0px -1px 1px 0px rgba(0,0,0,0.14), 0px -1px 3px 0px rgba(0,0,0,0.12)",
      }}
    >
      <Typography
        variant="body2"
        dangerouslySetInnerHTML={{ __html: DomPurify.sanitize(HELP_HTML_TEXT) }}
      />
      <Version />
    </Stack>
  );
}
