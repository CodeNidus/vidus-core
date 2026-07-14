import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ["src/index.js"],
  format: ["esm", "cjs"],
  platform: "browser",
  target: "es2020",
  clean: true,
  dts: false,
  sourcemap: true,
  splitting: false,
  treeshaking: false,
  minify: false,
  external: []
});