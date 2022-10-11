import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { Typography } from "@mui/material";
import {getDisplayQTitle} from "../util/util";

export default function QuestionnaireSelector(props) {
  const { title, list, handleSelectorChange } = props;
  const defaultMenuItem = () => (
    <MenuItem disabled value="">
      <em>Please Select One</em>
    </MenuItem>
  );
  const onChange = (event) => {
    if (handleSelectorChange && typeof handleSelectorChange === "function") {
      handleSelectorChange(event);
    }
  }
  return (
    <Stack direction="column" id="questionnaireSelector">
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
            value={props.value}
            renderValue={(value) => {
              if (!value) return defaultMenuItem();
              else
                return (
                  <Typography
                    color="primary"
                    variant="subtitle1"
                    sx={{ fontSize: "1.1rem" }}
                  >
                    {value}
                  </Typography>
                );
            }}
            onChange={onChange}
            label="Questionnaire"
            displayEmpty
            sx={{
              marginTop: 0,
              marginBottom: 0,
            }}
            defaultValue={""}
          >
            {list.map((item, index) => {
              return (
                <MenuItem value={item} key={`select_q_${index}`}>
                  {getDisplayQTitle(item)}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>
      )}
    </Stack>
  );
}
QuestionnaireSelector.propTypes = {
  handleSelectorChange: PropTypes.func,
  list: PropTypes.array,
  title: PropTypes.string,
};
