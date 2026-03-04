import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import { Button, Stack, Typography } from "@mui/material";
import { getEnvAboutContent } from "../util";
import SimpleModal from "./SimpleModal";

export default function AboutModal({ open, onClose }) {
  const content = getEnvAboutContent();
  return (
    <SimpleModal open={open} onClose={() => onClose(false)} sx={{ maxWidth: 600, padding: 1}}>
      <Stack gap={2}>
        <Typography variant="h5">UCSD CNICS PRO Summary</Typography>
        {content && <Typography variant="body1" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />}
        <Stack flexDirection={"row"} justifyContent={"flex-end"} alignItems={"center"}>
          <Button variant="text" fontSize="small" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Stack>
    </SimpleModal>
  );
}
AboutModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
