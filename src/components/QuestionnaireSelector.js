import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import { Typography } from "@mui/material";
import { FhirClientContext } from "../context/FhirClientContext";
import { getDisplayQTitle, scrollToAnchor } from "../util/util";

export default function QuestionnaireSelector(props) {
  let scrollToTimeoutId = 0;
  const { client } = useContext(FhirClientContext);
  const { title, list, handleSelectorChange } = props;
  const [selectList, setSelectList] = useState({
    list: list.map((item) => ({ id: item })),
    loaded: false
});
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
      () => scrollToAnchor(String(event.target.value).toLowerCase()),
      50
    );
  };
  const getDisplayName = (value) => {
    const arrMatch = selectList.list.filter((item) => item.id === value);
    if (arrMatch.length)
      return arrMatch[0].title
        ? arrMatch[0].title
        : arrMatch[0].id.toUpperCase();
    return value.toUpperCase();
  };
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
      sx={{ minWidth: 300, paddingLeft: 1, paddingRight: 1 }}
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
        {selectList.list.map((item, index) => {
          return (
            <MenuItem value={item.id} key={`select_q_${index}`}>
              {item.title ? item.title : getDisplayQTitle(item.id)}
            </MenuItem>
          );
        })}
      </Select>
    </FormControl>
  );
  useEffect(() => {
    if (selectList.loaded) return;
    client
      .request(
        `Questionnaire?name:contains=${list.join(",")}&_elements=id,name,title`,
        {
          pageLimit: 0,
          flat: true,
        }
      )
      .then((data) => {
        const transformedList = [
          ...list
            .filter((item) => {
              const inList =
                data.filter((o) => String(o.id).toLowerCase().includes(item))
                  .length > 0;
              return !inList;
            })
            .map((item) => ({
              id: item,
            })),
          ...data.map((item) => {
            item.id = getDisplayQTitle(item.id);
            return item;
          }),
        ];
        setSelectList({
          loaded: true,
          list : transformedList});
      });
  }, [client, list, selectList.loaded]);
  return (
    <Stack direction="column" id="questionnaireSelector" sx={{ padding: 2 }}>
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
