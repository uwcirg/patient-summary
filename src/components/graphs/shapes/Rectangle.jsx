import React from "react";
import PropTypes from "prop-types";

const Square = (props) => {
  const { cx, cy, stroke, width = 6, height = 4, isHovered } = props;
  return (
    <rect
      x={cx - width / 2}
      y={cy - height / 2}
      width={isHovered ? width * 1.2 : width}
      height={isHovered ? height * 1.2 : height}
      fill={stroke}
    />
  );
};
export default Square;

Square.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  stroke: PropTypes.string,
  isHovered: PropTypes.bool,
};
