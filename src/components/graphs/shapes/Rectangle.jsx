import React from "react";
import PropTypes from "prop-types";

const Square = (props) => {
  const { cx, cy, stroke } = props;
  return <rect x={cx - 4} y={cy - 3} width="8" height="6" fill={stroke} />;
};
export default Square;

Square.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
};
