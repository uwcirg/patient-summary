import React, { useReducer } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getShape } from "./shapes";
import { isEmptyArray } from "@/util";
import { COLORS, LEGEND_ICON_TYPES } from "@/config/chart_config";

export default function LineCharts(props) {
  let { data, keys = [] } = props;
  let visStates = {};
  if (isEmptyArray(keys)) {
    keys = [...new Set(data?.map((o) => o.key))];
  }
  keys.forEach((key) => (visStates[key] = true));
  function reducer(state, action) {
    if (!action.key) return state;
    return {
      ...state,
      [action.key]: !state[action.key],
    };
  }
  const [state, dispatch] = useReducer(reducer, visStates);

  if (isEmptyArray(data)) return <Alert severity="warning">No chart data available</Alert>;

  const handleLegendClick = (data) => {
    dispatch({
      key: data.dataKey,
    });
  };

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={420}
      minHeight={380}
      style={{
        boxShadow:
          "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)",
      }}
      className={keys.length > 1 ? "multiple" : "single"}
    >
      <LineChart data={data} margin={{ top: 25, right: 64, left: 20, bottom: 24 }} width={730} height={420}>
        <CartesianGrid strokeDasharray="2 2" />
        <XAxis
          dataKey="date"
          interval="preserveStartEnd"
          angle={-90}
          height={72}
          textAnchor="end"
          tickFormatter={(item) => new Date(item).toISOString().substring(0, 10)}
          tick={{ style: { fontSize: "12px", fontWeight: 500 }, dy: 4, dx: -4 }}
        />
        <YAxis type="number" tick={{ fontWeight: 500, fontSize: "12px" }} width={32} />
        <Tooltip
          itemStyle={{ fontSize: "10px" }}
          labelStyle={{ fontSize: "10px" }}
          animationBegin={500}
          animationDuration={550}
          labelFormatter={(value, data) => {
            if (!isEmptyArray(data) && value > 0) return new Date(value).toISOString().substring(0, 10);
            return "";
          }}
        />
        <Legend
          align="left"
          verticalAlign="middle"
          layout="vertical"
          iconSize={12}
          onClick={handleLegendClick}
          className={keys.length > 1 ? "multple" : "single"}
        ></Legend>
        {keys.map((key, index) => {
          return (
            <Line
              name={key}
              dataKey={key}
              stroke={COLORS[index]}
              key={`${key}_line_${index}`}
              legendType={LEGEND_ICON_TYPES[index] ?? "circle"}
              dot={(props) => getShape(LEGEND_ICON_TYPES[index] ?? "circle", props)}
              activeDot={(props) => getShape(LEGEND_ICON_TYPES[index] ?? "circle", { ...props, stroke: "#444" })}
              isAnimationActive={false}
              animationBegin={400}
              strokeWidth={2}
              connectNulls={true}
              hide={!state[key]}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}

LineCharts.propTypes = {
  data: PropTypes.array,
  keys: PropTypes.array,
};
