import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import pluginJsxAlly from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import pluginImport from "eslint-plugin-import";

/** @type {import('eslint').Linter.Config[]} */

export default [
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginJsxAlly.flatConfigs.recommended,
  pluginImport.flatConfigs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: { globals: globals.browser, ecmaVersion: "latest" },
    files: ["**/*.{js,mjs,cjs,jsx}"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    plugins: {
      js: pluginJs,
      "react-hooks": reactHooks,
      react: pluginReact,
    },
    ignores: ["dist"],
    settings: {
      react: {
        version: "detect",
      },
      globals: {
        vi: true,
      },
      "import/ignore": [
        "src/util/*.js$"
      ]
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
        },
      ],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "warn",
      "import/namespace": "off",
      "import/no-unresolved": "off",
      "import/order": "error",
      "import/no-duplicates": "error",
      "import/default": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off"
    },
  },
];
