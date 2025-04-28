import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "canvas-layers.js",
  output: {
    file: "CanvasLayers.js",
    format: "es",
    sourcemap: true,
  },
  plugins: [resolve()],
};
