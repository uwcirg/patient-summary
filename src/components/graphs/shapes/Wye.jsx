import React from "react";
import PropTypes from "prop-types";

const Wye = (props) => {
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
      <path d="M12,2 L14,8 L20,4 L22,7 L16,11 L16,22 L8,22 L8,11 L2,7 L4,4 L10,8 Z" />
    </svg>
  );
};
export default Wye;

Wye.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  stroke: PropTypes.string,
  isHovered: PropTypes.bool,
};
