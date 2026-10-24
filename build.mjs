import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/card.js"],
  outfile: "dist/room-climate-card.js",
  bundle: true,
  format: "esm",
  target: "es2020",
  // Kept readable on purpose: the file ends up in people's config/www/ and in
  // the browser's dev tools, and it is small enough unminified.
  minify: false,
  loader: { ".css": "text" },
  define: { __VERSION__: JSON.stringify(version) },
  banner: {
    js: `/* room-climate-card ${version} — built from src/, do not edit. https://github.com/pilgaard/room-climate-card */`,
  },
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
