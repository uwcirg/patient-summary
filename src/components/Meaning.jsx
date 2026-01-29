// Meaning.jsx
import React from "react";
import PropTypes from "prop-types";
import DOMPurify from "dompurify";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { hasHtmlTags } from "@util";

function splitOnFirstColon(text) {
  const idx = text.indexOf(":");
  if (idx === -1) return null;

  const left = text.slice(0, idx).trim();
  const right = text.slice(idx + 1).trim();

  // If either side is empty, don't treat it as a label/value pair
  if (!left || !right) return null;

  return { left, right };
}

export default function Meaning({ id, meaning, alert, warning, className = "" }) {
  if (!meaning) return null;

  const parts = String(meaning).includes("|") ? String(meaning).split("|") : [String(meaning)];
  const cellClass = alert ? "text-danger" : warning ? "text-warning" : "";

  return (
    <Box className={`meaning-wrapper ${className}`.trim()}>
      {parts.map((m, index) => {
        const key = `${id ?? "row"}_meaning_${index}`;
        const s = String(m ?? "");

        // If it's HTML, sanitize, then (optionally) split text-only cases by ":" won't apply
        if (hasHtmlTags(s)) {
          const sanitized = DOMPurify.sanitize(s, {
            ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "span", "div", "p"],
            ALLOWED_ATTR: ["class"],
          });

          return (
            <Box
              className={`table-cell-item circle-container ${cellClass}`}
              key={key}
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          );
        }

        // Plain text: if it contains "label: value", render as Stack
        const pair = splitOnFirstColon(s);
        if (pair) {
          return (
            <Stack
              key={key}
              className={`table-cell-item table-cell-item-stack ${cellClass}`}
              direction="row"
              spacing={0.25}
              justifyContent="flex-start"
              alignItems="flex-end"
              sx={{
                borderBottom: index !== parts.length - 1 ? "1px solid #ececec" : "none",
                paddingBottom: "4px",
              }}
            >
              <Box component="span" sx={{ flex: 1 }}>
                {pair.left}:
              </Box>
              <Box component="span" sx={{ flex: 1 }}>
                {pair.right}
              </Box>
            </Stack>
          );
        }

        // Default rendering
        return (
          <Box className={`table-cell-item ${cellClass}`} key={key}>
            {s}
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
