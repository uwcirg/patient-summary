import * as React from "react";
import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 420,
  bgcolor: "background.paper",
  border: "2px solid #ececec",
  boxShadow: 12,
  p: 3,
};

export default function SimpleModal({ open, onClose, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>{children}</Box>
    </Modal>
  );
}

SimpleModal.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
