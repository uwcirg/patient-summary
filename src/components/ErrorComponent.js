import * as React from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';

export default function Error(props) {
  return (
    <div><Alert severity="error" variant="filled">Error launching <span>{props.message}</span></Alert></div>
    );
}

Error.propTypes = {
  message: PropTypes.string
}
