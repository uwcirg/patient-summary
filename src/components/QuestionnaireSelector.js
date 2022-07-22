import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { getEnv } from "../util/util";
export default function QuestionnaireSelector(props) {
  const { selected, handleSelectorChange } = props;
  const getQuestionnaireList = () => {
    const configList = getEnv("REACT_APP_QUESTIONNAIRES");
    if (configList) return configList.split(',');
    return [];
  };
  const list = getQuestionnaireList();
  return (
    <>
      {!list.length && <Alert severity="warning" sx={{mt: 2}}>No questionnaire(s) specified.  Is it configured?</Alert>}
      {list.length > 0 && <FormControl
        variant="standard"
        sx={{ minWidth: 120, width: 300 }}
        margin="dense"
      >
        <Select
          id="qSelector"
          value={selected}
          onChange={handleSelectorChange}
          label="Questionnaire"
          displayEmpty
          sx={{
            marginTop: 0,
            marginBottom: 0,
            fontSize: "1.01em"
          }}
        >
          <MenuItem disabled value="">
            <em>Please Select One</em>
          </MenuItem>
          {list.map((item, index) => {
            return (
              <MenuItem value={item} key={`select_q_${index}`}>
                {item}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>}
    </>
  );
}
QuestionnaireSelector.propTypes = {
  selected: PropTypes.string,
  handleSelectorChange: PropTypes.func,
};
