import { defineConfig } from "tsup"

export default defineConfig({
  clean: true,
  entry: {
    "bin/index": "bin/index.ts",
  },
  external: ["tinyglobby"],
  format: ["esm"],
  outDir: "dist",
})
