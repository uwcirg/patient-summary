import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { Typography } from "@mui/material";
export default function QuestionnaireSelector(props) {
  const { title, list, selected, handleSelectorChange } = props;
  const defaultMenuItem = () => (
    <MenuItem disabled value="">
      <em>Please Select One</em>
    </MenuItem>
  );
  return (
    <>
      <Typography variant="h6" component="h2" color="secondary">
        {title || "Questionnaire List"}
      </Typography>
      {!list.length && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No questionnaire(s) specified. Is it configured?
        </Alert>
      )}
      {list.length > 0 && (
        <FormControl
          variant="standard"
          sx={{ minWidth: 120, width: 300 }}
          margin="dense"
        >
          <Select
            id="qSelector"
            value={selected}
            renderValue={(value) => {
              if (!value) return defaultMenuItem();
              else
                return (
                  <Typography color="primary" variant="subtitle1" sx={{fontSize: '1.1rem'}}>
                    {value}
                  </Typography>
                );
            }}
            onChange={handleSelectorChange}
            label="Questionnaire"
            displayEmpty
            sx={{
              marginTop: 0,
              marginBottom: 0,
            }}
          >
            {list.map((item, index) => {
              return (
                <MenuItem value={item} key={`select_q_${index}`}>
                  {item}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      )}
    </>
  );
}
QuestionnaireSelector.propTypes = {
  selected: PropTypes.string,
  handleSelectorChange: PropTypes.func,
  list: PropTypes.array,
  title: PropTypes.string,
};
