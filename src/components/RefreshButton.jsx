import React from "react";
import PropTypes from "prop-types";
import Fab from "@mui/material/Fab";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function RefreshButton({ ref, sx, ...props }) {
  return (
    <Fab
      ref={ref}
      size="small"
      {...props}
      className="print-hidden"
      sx={{ position: "fixed", bottom: 6, right: 24, backgroundColor: "lighter.main", boxShadow: "none", ...sx }}
      onClick={
        props.onClick ??
        (() => {
          window.location.reload();
        })
      }
      title="Refresh"
    >
      <RefreshIcon aria-label="Refresh" sx={{ color: "muter.main" }} />
      {props.children}
    </Fab>
  );
}

RefreshButton.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
  ref: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  sx: PropTypes.object,
  onClick: PropTypes.func,
};
