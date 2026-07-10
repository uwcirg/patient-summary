import {memo, useState, useEffect} from "react";
import PropTypes from "prop-types";
import { createDotRenderer } from "@components/graphs/ChartDotRenderers";
const ChartDot = memo(function ChartDot({
  dotProps,
  dotConfig,
  dotKey,
  dotListenersRef,
  onEnter,
  onLeave,
}) {
  const [isHovered, setIsHovered] = useState(false);

 useEffect(() => {
   const listeners = dotListenersRef.current; // capture at registration time
   listeners.set(dotKey, setIsHovered);
   return () => listeners.delete(dotKey);
 }, [dotKey, dotListenersRef]);

  const CustomDot = createDotRenderer({ ...dotConfig, isHovered });
  const { key, ...rest } = dotProps;

  return (
    <g
      onPointerEnter={(e) => {
        e.stopPropagation();
        onEnter(e);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        onEnter(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onEnter(e);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        onLeave(e);
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        onLeave(e);
      }}
    >
      <CustomDot {...rest} />
    </g>
  );
});
export default ChartDot;

ChartDot.propTypes = {
  dotProps: PropTypes.shape({
    cx: PropTypes.number,
    cy: PropTypes.number,
    r: PropTypes.number,
    key: PropTypes.string,
    index: PropTypes.number,
    payload: PropTypes.object,
    value: PropTypes.number,
  }),
  dotConfig: PropTypes.shape({
    sources: PropTypes.arrayOf(PropTypes.string),
    isSmallScreen: PropTypes.bool,
    xFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    yFieldKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    dotColor: PropTypes.string,
    dotRadius: PropTypes.number,
    activeDotRadius: PropTypes.number,
    shape: PropTypes.string,
    hitRadiusMultiplier: PropTypes.number,
    minHitRadius: PropTypes.number,
    params: PropTypes.shape({
      r: PropTypes.number,
      width: PropTypes.number,
      height: PropTypes.number,
    }),
  }),
  dotKey: PropTypes.string.isRequired,
  dotListenersRef: PropTypes.shape({
    current: PropTypes.instanceOf(Map),
  }).isRequired,
  onEnter: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};
