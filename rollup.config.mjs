import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const sdPlugin = "com.skizd.deckedstream.sdPlugin";

/**
 * Bundles the plugin (SDK + our code) into a single self-contained file so the
 * .sdPlugin folder can ship without node_modules.
 */
export default {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    format: "cjs",
    sourcemap: true,
    sourcemapPathTransform: (relativePath) =>
      relativePath.startsWith("../") ? relativePath : `../../${relativePath}`
  },
  plugins: [
    typescript({ tsconfig: "./tsconfig.json", mapRoot: "./" }),
    nodeResolve({ browser: false, exportConditions: ["node"], preferBuiltins: true }),
    commonjs()
  ]
};
