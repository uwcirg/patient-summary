import React from "react";
import PropTypes from "prop-types";

const Star = (props) => {
  const { cx, cy, stroke } = props;
  return (
    <svg x={cx - 6} y={cy - 6} width="12" height="12" viewBox="0 0 24 24" fill={stroke}>
      <polygon points="12,2 15,10 23,10 17,15 19,23 12,18 5,23 7,15 1,10 9,10" />
    </svg>
  );
};

export default Star;

Star.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
};
