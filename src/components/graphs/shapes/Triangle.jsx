import React from "react";
import PropTypes from "prop-types";

const Triangle = (props) => {
  const { cx, cy, stroke } = props;
  return <polygon points={`${cx},${cy - 5} ${cx - 5},${cy + 5} ${cx + 5},${cy + 5}`} fill={stroke} />;
};
export default Triangle;

Triangle.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
};
