import {useState, useLayoutEffect, useContext} from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { Typography } from "@mui/material";
import { FhirClientContext } from "../context/FhirClientContext";
import { getDisplayQTitle } from "../util/util";
import { QUESTIONNAIRE_ANCHOR_ID_PREFIX } from "../consts/consts";

export default function QuestionnaireSelector(props) {
  let scrollToTimeoutId = 0;
  const { client } = useContext(FhirClientContext);
  const { title, list, handleSelectorChange } = props;
  const [selectList, setSelectList] = useState(list.map(item => ({id: item})));
  const defaultMenuItem = () => (
    <MenuItem disabled value="">
      <em>Please Select One</em>
    </MenuItem>
  );

  const onChange = (event) => {
    if (handleSelectorChange && typeof handleSelectorChange === "function") {
      handleSelectorChange(event);
    }
    clearTimeout(scrollToTimeoutId);
    scrollToTimeoutId = setTimeout(
      () =>
        document
          .querySelector(
            `#${QUESTIONNAIRE_ANCHOR_ID_PREFIX}_${String(event.target.value).toLowerCase()}`
          )
          .scrollIntoView(),
      50
    );
  };
  const getDisplayName = (value) => {
    const arrMatch = selectList.filter(item => item.id === value);
    if (arrMatch.length) return arrMatch[0].title;
    return value;
  }
  const renderTitle = () => (
    <Typography variant="h6" component="h2" color="secondary">
      {title || "Questionnaire List"}
    </Typography>
  );
  const renderWarning = () => (
    <Alert severity="warning" sx={{ mt: 2 }}>
      No questionnaire(s) specified. Is it configured?
    </Alert>
  );
  const renderSelector = () => (
    <FormControl
      variant="standard"
      sx={{ minWidth: 300 }}
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
                {getDisplayName(value)}
              </Typography>
            );
        }}
        onChange={(event) => onChange(event)}
        label="Questionnaire"
        displayEmpty
        sx={{
          marginTop: 0,
          marginBottom: 0,
        }}
        defaultValue={""}
      >
        {selectList.map((item, index) => {
          return (
            <MenuItem value={item.id} key={`select_q_${index}`}>
              {item.title ? item.title : getDisplayQTitle(item.id)}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
  useLayoutEffect(() => {
    client
      .request(`Questionnaire?name:contains=${list.join(",")}`, {
        pageLimit: 0,
        flat: true,
      })
      .then((data) => {
        setSelectList(
          data.map((item) => {
            item.id = getDisplayQTitle(item.id);
            return item;
          })
        );
      });
  }, [client, list]);
  return (
    <Stack direction="column" id="questionnaireSelector">
      {!list.length && renderWarning()}
      {list.length > 0 && renderTitle()}
      {list.length > 0 && renderSelector()}
    </Stack>
  );
}
QuestionnaireSelector.propTypes = {
  handleSelectorChange: PropTypes.func,
  list: PropTypes.array,
  title: PropTypes.string,
};
