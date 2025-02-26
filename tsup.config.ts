import { defineConfig } from "tsup"

export default defineConfig({
  clean: true,
  entry: {
    "bin/index": "bin/index.ts",
  },
  external: ["path"],
  format: ["esm"],
  outDir: "dist",
})
