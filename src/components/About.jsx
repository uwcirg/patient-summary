import PropTypes from "prop-types";
import { Box, Button, Stack, Typography } from "@mui/material";
import { getEnvAboutContent } from "../util";
import SimpleModal from "./SimpleModal";
import Version from "./Version";
export default function AboutModal({ open, onClose }) {
  const content = getEnvAboutContent();
  return (
    <SimpleModal open={open} onClose={() => onClose(false)}>
      {content && <div dangerouslySetInnerHTML={{ __html: content }} />}
      {!content && (
        <Box>
          <Typography variant="h5">UCSD CNICS PRO Summary</Typography>
          <p>
            Information: <a href="https://sites.uab.edu/cnics/">here</a>
          </p>
          <p>
            Contact: <a href="mailto:cnicspros@cirg.uw.edu">cnicspros@cirg.uw.edu</a>
          </p>
          <Stack flexDirection={"row"} justifyContent={"space-between"} alignItems={"center"}>
            <Version />
            <Button variant="text" fontSize="small" onClick={onClose} sx={{mt: 1.5}}>
              Close
            </Button>
          </Stack>
        </Box>
      )}
    </SimpleModal>
  );
}
AboutModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
