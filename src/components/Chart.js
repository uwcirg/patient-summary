import PropTypes from "prop-types";
import Error from "./Error";
import LineChart from "./graphs/LineCharts";
const Chart = (props) => {
  const eligibleCharts = ["linechart"];
  return (
    <div className="chart__container">
      {props.type === "linechart" && <LineChart {...props.data}></LineChart>}
      {eligibleCharts.indexOf(props.type) === -1 && <Error message="invalid graph type specified"></Error>}
      {/* other types of graph go here */}
    </div>
  );
};
Chart.propTypes = {
  data: PropTypes.object,
  type: PropTypes.string.isRequired
};
export default Chart;
