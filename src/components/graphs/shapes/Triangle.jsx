import React from "react";
import PropTypes from "prop-types";

const Triangle = (props) => {
  const { cx, cy, stroke, isHovered = false } = props;
  const offset = isHovered ? 5 : 4;
  return <polygon points={`${cx},${cy - offset} ${cx - offset},${cy + offset} ${cx + offset},${cy + offset}`} fill={stroke} />;
};
export default Triangle;

Triangle.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
  isHovered: PropTypes.bool
};
