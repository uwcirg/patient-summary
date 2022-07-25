import PropTypes from "prop-types";
import BarChart from "./graphs/BarChart";
const Chart = (props) => {
  return (
    <div className="chart__container">
      {props.type === "barchart" && <BarChart {...props.data}></BarChart>}
      {/* other types of graph go here */}
    </div>
  );
};
Chart.propTypes = {
  data: PropTypes.object,
  type: PropTypes.string.isRequired
};
export default Chart;
