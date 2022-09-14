import * as React from 'react';
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';

export default function Error(props) {
  return (
    <div><Alert severity="error" variant="filled">{props.message}</Alert></div>
    );
}

Error.propTypes = {
  message: PropTypes.string
}
