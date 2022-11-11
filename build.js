const { build } = require("esbuild");
const { dependencies } = require("./package.json");

const esbuildPlugin = require("node-stdlib-browser/helpers/esbuild/plugin");
const stdLibBrowser = require("node-stdlib-browser");

const entryFile = "src/index.js";
const shared = {
  entryPoints: [entryFile],
  bundle: true,
  sourcemap: true,
  minify: true,
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
