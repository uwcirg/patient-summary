import React from "react";
import PropTypes from "prop-types";

const Ring = (props) => {
  const { cx, cy, stroke, radius } = props;
  return <circle cx={cx} cy={cy} r={radius || 3} stroke={stroke} strokeWidth={2} fill="none" />;
};
export default Ring;

Ring.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  radius: PropTypes.number,
  stroke: PropTypes.string,
};
