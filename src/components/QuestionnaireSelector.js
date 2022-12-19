import { useState, useEffect, useContext } from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
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
    list: list ? list.map((item) => ({ id: item })) : [],
    loaded: false,
  });

  const hasList = () => list && list.length > 0;
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
    const arrMatch = selectList.list.filter(
      (item) =>
        String(item.name).toLowerCase().indexOf(String(value).toLowerCase()) !==
          -1 ||
        String(item.id).toLowerCase().indexOf(String(value).toLowerCase()) !==
          -1
    );
    if (arrMatch.length)
      return arrMatch[0].title
        ? arrMatch[0].title
        : arrMatch[0].id.toUpperCase();
    return value.toUpperCase();
  };
  const renderTitle = () => (
    <Typography variant="h6" component="h2" color="secondary" noWrap={true}>
      {title || "Questionnaire List"}
    </Typography>
  );
  const renderWarning = () => (
    <Alert severity="warning" sx={{ mt: 2 }}>
      No matching questionnaire(s) found. Is it configured correctly?
    </Alert>
  );
  const renderSelector = () => {
    if (!selectList.list || !selectList.list.length) return renderWarning();
    return (
      <FormControl
        variant="standard"
        sx={{
          minWidth: 300,
          paddingLeft: 1,
          paddingRight: 1,
        }}
        margin="dense"
        className="print-hidden"
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
                  sx={{ whiteSpace: "normal" }}
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
  };
  useEffect(() => {
    if (selectList.loaded) return;
    if (!client) {
      setSelectList({
        loaded: true,
        list: [],
      });
      return;
    }
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
          list: transformedList,
        });
      })
      .catch((e) => {
        setSelectList({
          loaded: true,
          list: [],
        });
      });
  }, [client, list, selectList.loaded]);

  if (!selectList.loaded)
    return (
      <Box sx={{ padding: 2 }}>
        <CircularProgress></CircularProgress>
      </Box>
    );
  return (
    <Stack direction="column" id="questionnaireSelector" sx={{ padding: 2 }}>
      {!hasList() && renderWarning()}
      {hasList() && (
        <>
          {renderTitle()}
          {renderSelector()}
        </>
      )}
    </Stack>
  );
}
QuestionnaireSelector.propTypes = {
  handleSelectorChange: PropTypes.func,
  list: PropTypes.array,
  title: PropTypes.string,
};
