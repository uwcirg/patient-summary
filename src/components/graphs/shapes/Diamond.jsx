import React from "react";
import PropTypes from "prop-types";

const Diamond = (props) => {
  const { cx, cy, stroke } = props;
  return (
    <svg x={cx - 5} y={cy - 5} width="10" height="10" viewBox="0 0 24 24" fill={stroke}>
      <polygon points="12,2 24,12 12,24 2,12" />
    </svg>
  );
};
export default Diamond;

Diamond.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
};
