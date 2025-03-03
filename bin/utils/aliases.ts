import fs from "node:fs"
import stripJsonComments from "strip-json-comments"

export const getAliases = async () => {
  let aliases: Record<string, string> = {}

  const configFile = ["tsconfig.json", "jsconfig.json"].find((file) =>
    fs.existsSync(file),
  )

  if (configFile) {
    let config = await fs.promises.readFile(configFile, "utf8")

    const { compilerOptions } = JSON.parse(
      stripJsonComments(config, { trailingCommas: true }),
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
    }
  }

  if (!aliases["@/"]) {
    aliases["@/"] = fs.existsSync("src") ? "src/" : ""
  }

  return aliases
}
