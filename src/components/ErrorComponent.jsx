import * as React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";

export default function Error(props) {
  const { message } = props;
  const getMessage = () => {
    if (!message) return "";
    if (typeof message !== "string" && message?.message) {
      return message.message;
    }
    if (typeof message !== "string") {
      if (Array.isArray(message)) {
        return (
          <ul>
            {message.map((m, index) => (
              <li key={`errormessage_${index}`}>{m}</li>
            ))}
          </ul>
        );
      }
      return "Error occurred. See console for detail.";
    }
    return message;
  };
  const messageToBeRendered = getMessage();
  const isString = typeof messageToBeRendered === "string";
  const alertParams = {
    severity: props.severity ?? "error",
    variant: "filled",
    sx: props.sx,
    icon: props.icon
  };
  return (
    <div className="error-container">
      {isString && (
        <Alert {...alertParams}>
          <div dangerouslySetInnerHTML={{ __html: messageToBeRendered }}></div>
        </Alert>
      )}
      {!isString && <Alert {...alertParams}>{messageToBeRendered}</Alert>}
    </div>
  );
}

Error.propTypes = {
  message: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.array]),
  severity: PropTypes.string,
  sx: PropTypes.object,
  icon: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
};
