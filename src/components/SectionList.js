import PropTypes from "prop-types";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { scrollToElement } from "../util/util";

export default function SectionList(props) {
  const { list, onClickEvent, expanded } = props;
  if (!list || !list.length) return null;
  return (
    <List sx={{ marginTop: 3 }} className="sections-list">
      {list.map((section) => (
        <ListItem key={section.id} disablePadding sx={{ minHeight: "50px" }}>
          <ListItemButton
            onClick={() => {
              scrollToElement(`anchor_${section.id}`);
              if (onClickEvent) onClickEvent();
            }}
          >
            {section.icon && (
              <ListItemIcon title={section.title}>{section.icon()}</ListItemIcon>
            )}

            {expanded &&<ListItemText
              primary={section.title}
              primaryTypographyProps={{
                variant: "body1",
                component: "h3",
                sx: {
                  fontSize: "1.1rem",
                  fontWeight: 500,
                  whiteSpace: "normal",
                },
              }}
            />}
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

SectionList.propTypes = {
  list: PropTypes.array,
  onClickEvent: PropTypes.func,
  expandFlag: PropTypes.bool
};