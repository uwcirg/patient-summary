import { Dot } from "recharts";
import { isNumber } from "../../../util";
import Square from "./Square";
import Rectangle from "./Rectangle";
import Cross from "./Cross";
import Star from "./Star";
import Diamond from "./Diamond";
import Triangle from "./Triangle";

export const getShape = (shape, props) => {
  const { key, value, ...otherProps } = props;
  if (!isNumber(value)) return null;
  switch (shape) {
    case "cross":
      return <Cross key={key} {...otherProps}></Cross>;
    case "diamond":
      return <Diamond key={key} {...otherProps}></Diamond>;
    case "rect":
    case "rectanle":
      return <Rectangle key={key} {...otherProps}></Rectangle>;
    case "square":
      return <Square key={key} {...otherProps}></Square>;
    case "star":
      return <Star key={key} {...otherProps}></Star>;
    case "triangle":
      return <Triangle key={key} {...otherProps}></Triangle>;
    default:
      return <Dot key={key} {...otherProps} fill={otherProps.stroke}></Dot>;
  }
};
