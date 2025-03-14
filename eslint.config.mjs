import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,jsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    settings: {
      "react": {
        "version": "detect"
      },
      extends: [
        "react-app",
        "plugin:react/jsx-runtime",
        "plugin:jsx-a11y/recommended",
      ],
      globals: {
        vi: true,
      },
    },
  },
];
