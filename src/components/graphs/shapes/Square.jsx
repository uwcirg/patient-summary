import React from "react";
import PropTypes from "prop-types";

const Square = (props) => {
  const { cx, cy, stroke } = props;
  return <rect x={cx - 5} y={cy - 5} width="8" height="8" fill={stroke} />;
};
export default Square;

Square.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
};
