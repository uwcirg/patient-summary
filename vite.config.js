import { resolve } from "path";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import react from "@vitejs/plugin-react";
import commonjs from "vite-plugin-commonjs";
import dynamicImport from "vite-plugin-dynamic-import";
import eslintPlugin from "vite-plugin-eslint";

export default defineConfig({
  // Specify the path at which the application will be deployed on a server. The path MUST end with "/".
  // To deploy at the root path, use "/" or remove the "base" property entirely.
  envPrefix: "REACT_",
  plugins: [
    react(),
    eslintPlugin(),
    dynamicImport(/* options */),
    nodePolyfills({
      // include polyfills for the modules that Vite/Rollup warns about
      include: ["events", "timers", "fs"],
    }),
    commonjs({
      filter(id) {
        // `node_modules` is exclude by default, so we need to include it explicitly
        // https://github.com/vite-plugin/vite-plugin-commonjs/blob/v0.7.0/src/index.ts#L125-L127
        if (id.includes("node_modules/commonmark")) {
          return true;
        }
      },
    }),
  ],
  build: {
    // default chunk size limit is 500, but that's nearly impossible due to large JSON files
    chunkSizeWarningLimit: 2000,
    // specify rollup options to enable multiple entry points and break chunks up to smaller sizes
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        launch: resolve(__dirname, "launch.html"),
      },
      output: {
        manualChunks: (id) => {
          // if (id.includes("cql-exec")) {
          //   return "cqlExec";
          // }
          // if (id.includes("mui") || id.includes("material")) {
          //   return "materialUI";
          // }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    css: true,
    reporters: ["verbose"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*"],
      exclude: ["src/__tests__/cql/*.js"],
    },
  },
  esbuild: {
    supported: {
      "top-level-await": true, //browsers can handle top-level-await features
    },
  },
});
