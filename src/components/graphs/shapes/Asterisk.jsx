import React from "react";
import PropTypes from "prop-types";

const Asterisk = (props) => {
  const { cx, cy, stroke, width = 12, height = 12, isHovered = false } = props;
  return (
    <svg
      x={cx - width / 2}
      y={cy - height / 2}
      width={isHovered ? width * 1.2 : width}
      height={isHovered ? height * 1.2 : height}
      viewBox="0 0 24 24"
      fill={stroke}
    >
      <path d="M11,2 L13,2 L13,8 L19,4 L21,7 L15,11 L21,15 L19,18 L13,14 L13,22 L11,22 L11,14 L5,18 L3,15 L9,11 L3,7 L5,4 L11,8 Z" />
    </svg>
  );
};
export default Asterisk;

Asterisk.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  isHovered: PropTypes.bool,
};
