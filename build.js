const { build } = require("esbuild");
const { dependencies } = require("./package.json");
const { Generator } = require("npm-dts");

const esbuildPlugin = require("node-stdlib-browser/helpers/esbuild/plugin");
const stdLibBrowser = require("node-stdlib-browser");

const entryFile = "src/index.ts";
const shared = {
  entryPoints: [entryFile],
  bundle: true,
  minify: true,
  sourcemap: true,
  external: Object.keys(dependencies),
  plugins: [],
};

// common js build
build({
  ...shared,
  platform: "node",
  format: "cjs",
  outfile: "dist/index.js",
});

// module build for browsers
build({
  ...shared,
  outfile: "dist/index.esm.js",
  format: "esm",
  inject: [require.resolve("node-stdlib-browser/helpers/esbuild/shim")],
  define: {
    Buffer: "Buffer",
    fs: "fs",
    path: "path",
  },
  plugins: [...shared.plugins, esbuildPlugin(stdLibBrowser)],
});

new Generator(
  {
    tsc: "-p config/tsconfig.declarations.json",
    output: "dist/index.d.ts",
  },
  false,
  true
).generate();
