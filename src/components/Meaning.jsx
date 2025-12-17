// Meaning.jsx
import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import { hasHtmlTags } from "@util";

export default function Meaning({ id, meaning, alert, warning, className = "" }) {
  if (!meaning) return null;

  const parts = String(meaning).includes("|") ? String(meaning).split("|") : [String(meaning)];
  const cellClass = alert ? "text-danger" : warning ? "text-warning" : "";

  return (
    <Box className={`meaning-wrapper ${className}`.trim()}>
      {parts.map((m, index) => {
        const key = `${id ?? "row"}_meaning_${index}`;

        if (hasHtmlTags(m)) {
          const sanitized = DOMPurify.sanitize(m, {
            ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "span", "div", "p"],
            ALLOWED_ATTR: ["class"],
          });

          return (
            <Box className={`table-cell-item ${cellClass}`} key={key} dangerouslySetInnerHTML={{ __html: sanitized }} />
          );
        }

        return (
          <Box className={`table-cell-item ${cellClass}`} key={key}>
            {m}
          </Box>
        );
      })}
    </Box>
  );
}

Meaning.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  meaning: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  alert: PropTypes.bool,
  warning: PropTypes.bool,
  className: PropTypes.string,
};
