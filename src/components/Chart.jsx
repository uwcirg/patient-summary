import React, { useRef, useEffect } from "react";
import PropTypes from "prop-types";
import Error from "./ErrorComponent";
import LineChart from "./graphs/LineCharts";
let resizeChartTimeoutId = 0;
const Chart = (props) => {
  const eligibleCharts = ["linechart"];
  const chartRef = useRef();
  const CHART_SPACING = 240;

  useEffect(() => {
    const resizeEvent = () => {
      clearTimeout(resizeChartTimeoutId);
      resizeChartTimeoutId = setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.style.height = window.innerHeight - CHART_SPACING + "px";
        }
      }, 250);
    };
    window.addEventListener("resize", resizeEvent);
    return () => window.removeEventListener("resize", resizeEvent);
  }, []);
  return (
    <div
      className="chart__container"
      style={{
        width: {
          sm: "100%",
          md: "50%",
        },
        height: window.innerHeight - CHART_SPACING + "px",
        minHeight: props.data && props.data.chartHeight ? props.data.chartHeight + "px" : "520px",
      }}
      ref={chartRef}
    >
      {props.type === "linechart" && <LineChart {...props.data}></LineChart>}
      {eligibleCharts.indexOf(props.type) === -1 && <Error message="Graph type specified is not available."></Error>}
      {/* other types of graph go here */}
    </div>
  );
};
Chart.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    data: PropTypes.array,
    type: PropTypes.string,
    title: PropTypes.string,
    chartWidth: PropTypes.number,
    chartHeight: PropTypes.number,
    yAxisTitle: PropTypes.string,
    yFieldKey: PropTypes.string,
    yLabel: PropTypes.string,
    yDomain: PropTypes.array,
    yTicks: PropTypes.array,
    yTickFormatter: PropTypes.func,
    yLineFields: PropTypes.array,
    xTickFormatter: PropTypes.func,
    xFieldKey: PropTypes.string,
    xAxisTitle: PropTypes.string,
    xLabel: PropTypes.string,
    dataFormatter: PropTypes.func,
    tooltipLabelFormatter: PropTypes.func,
  }),
  type: PropTypes.string.isRequired,
};
export default Chart;
