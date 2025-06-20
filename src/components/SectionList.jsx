import React from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { isEmptyArray, scrollToElement } from "../util";

export default function SectionList(props) {
  const theme = useTheme();
  const { list, onClickEvent, expanded } = props;
  const renderList = !isEmptyArray(list) ? list : null;
  if (isEmptyArray(renderList)) return false;
  return (
    <List className="sections-list" sx={{ marginTop: theme.spacing(2) }}>
      {renderList.map((section) => (
        <ListItem
          key={`listItem_${section.id}`}
          disablePadding
          sx={{ minHeight: "50px" }}
        >
          <ListItemButton
            onClick={() => {
              scrollToElement(`anchor_${String(section.id).toLowerCase()}`);
              if (onClickEvent) onClickEvent();
            }}
          >
            {section.icon && (
              <ListItemIcon
                title={section.title}
                sx={{
                  minWidth: theme.spacing(4),
                }}
              >
                {section.icon()}
              </ListItemIcon>
            )}

            {expanded && (
              <ListItemText
                primary={section.title}
                primaryTypographyProps={{
                  variant: "subtitle2",
                  component: "h3",
                  sx: {
                    fontWeight: 500,
                    whiteSpace: "normal",
                    textWrap: "balance"
                  },
                }}
              />
            )}
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

SectionList.propTypes = {
  list: PropTypes.array,
  onClickEvent: PropTypes.func,
  expandFlag: PropTypes.bool,
  expanded: PropTypes.bool
};
