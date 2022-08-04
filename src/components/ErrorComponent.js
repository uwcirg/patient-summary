import * as React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";

export default function Error(props) {
  const {message} = props;
  const displayMessage = () => {
    if (typeof message !== "string") return "Error occurred see console for detail";
    return message;
  }
  return (
    <div>
      <Alert severity="error" variant="filled" sx={{ m: 2 }}>
        <span>{displayMessage()}</span>
      </Alert>
    </div>
  );
}

Error.propTypes = {
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};
