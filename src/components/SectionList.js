import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { scrollToElement } from "../util/util";

export default function SectionList(props) {
  const theme = useTheme();
  const { list, onClickEvent, expanded } = props;
  if (!list || !list.length) return null;
  return (
    <List className="sections-list" sx={{ marginTop: theme.spacing(3) }}>
      {list.map((section) => (
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
                  minWidth: theme.spacing(6),
                }}
              >
                {section.icon()}
              </ListItemIcon>
            )}

            {expanded && (
              <ListItemText
                primary={section.title}
                primaryTypographyProps={{
                  variant: "body1",
                  component: "h3",
                  sx: {
                    fontWeight: 500,
                    whiteSpace: "normal",
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
};
