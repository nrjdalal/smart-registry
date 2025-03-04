import fs from "node:fs"
import stripJsonComments from "strip-json-comments"

export const getAliases = async () => {
  let aliases: Record<string, string> = {}
  const aliasPaths = ["registry", "components", "src/components"]

  if (fs.existsSync("tsconfig.json")) {
    let tsconfig = await fs.promises.readFile("tsconfig.json", "utf8")

    const { compilerOptions } = JSON.parse(
      stripJsonComments(tsconfig, {
        trailingCommas: true,
      }),
    )

    if (compilerOptions.paths) {
      aliases = Object.entries(
        compilerOptions.paths as Record<string, [string]>,
      ).reduce(
        (acc, [key, [value]]) => {
          // remove leading './' from the value and remove trailing '*' from the key/value
          acc[key.replace(/\*$/, "")] = value
            .replace(/^\.\//, "")
            .replace(/\*$/, "")
          return acc
        },
        {} as Record<string, string>,
      )

      for (const path of aliasPaths) {
        if (fs.existsSync(path)) {
          aliases["@/"] = path === "src/components" ? "src/" : ""
        }
      }

      if (!Object.keys(aliases).includes("@/")) {
        throw new Error("No alias key '@/' found in compilerOptions.paths!")
      }

      return aliases
    }
  }

  for (const path of aliasPaths) {
    if (fs.existsSync(path)) {
      aliases["@/"] = path === "src/components" ? "src/" : ""
      return aliases
    }
  }

  throw new Error("Could not resolve aliases!")
}
