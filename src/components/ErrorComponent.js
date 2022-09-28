import * as React from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';

export default function Error(props) {
  const {message} = props;
  const getMessage = () => {
    if (!message) return "";
    if (typeof message !== "string") {
      console.log("Error ", message);
      return "Error occurred see console for detail";
    }
    return message;
  }
  return (
    <div><Alert severity="error" variant="filled">{getMessage()}</Alert></div>
    );
}

Error.propTypes = {
  message: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
}
