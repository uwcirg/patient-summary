import { resolve } from "path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import commonjs from "vite-plugin-commonjs";
import dynamicImport from "vite-plugin-dynamic-import";
import eslintPlugin from "vite-plugin-eslint";
import babel from "@rolldown/plugin-babel";

export default defineConfig({
  // Specify the path at which the application will be deployed on a server. The path MUST end with "/".
  // To deploy at the root path, use "/" or remove the "base" property entirely.
  envPrefix: "REACT_",
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    eslintPlugin(),
    dynamicImport(/* options */),
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
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@components": resolve(import.meta.dirname, "./src/components"),
      "@config": resolve(import.meta.dirname, "./src/config"),
      "@consts": resolve(import.meta.dirname, "./src/consts"),
      "@context": resolve(import.meta.dirname, "./src/context"),
      "@models": resolve(import.meta.dirname, "./src/models"),
      "@util": resolve(import.meta.dirname, "./src/util"),
    },
  },
  build: {
    // default chunk size limit is 500, but that's nearly impossible due to large JSON files
    chunkSizeWarningLimit: 2000,
    // specify rollup options to enable multiple entry points and break chunks up to smaller sizes
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        launch: resolve(import.meta.dirname, "launch.html"),
      },
      output: {
        manualChunks: (id) => {
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
    },
  },
});
