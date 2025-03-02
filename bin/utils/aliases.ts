import fs from "node:fs"
import stripJsonComments from "strip-json-comments"

export const getAliases = async () => {
  if (fs.existsSync("tsconfig.json")) {
    let tsconfig = await fs.promises.readFile("tsconfig.json", "utf8")

    const { compilerOptions } = JSON.parse(
      stripJsonComments(tsconfig, {
        trailingCommas: true,
      }),
    )

    if (compilerOptions.paths) {
      const aliases = Object.entries(
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

      if (!Object.keys(aliases).includes("@/"))
        throw new Error("No alias key '@/' found in tsconfig.json")

      return aliases
    }
  }

  throw new Error("No tsconfig.json found")
}
