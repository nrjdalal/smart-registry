import fs from "node:fs"

export const getAliases = async () => {
  const isTypescript = fs.existsSync("tsconfig.json")

  if (isTypescript) {
    let tsconfig = await fs.promises.readFile("tsconfig.json", "utf8")
    tsconfig = tsconfig.replace(/,\s*([\}\]])/g, "$1")
    const { compilerOptions } = JSON.parse(tsconfig)
    if (compilerOptions && compilerOptions.paths) {
      return Object.entries(
        compilerOptions.paths as Record<string, [string]>,
      ).reduce(
        (acc, [key, [value]]) => {
          acc[key.replace(/\*$/, "")] = value
            .replace(/^\.\//, "")
            .replace(/\*$/, "")
          return acc
        },
        {} as Record<string, string>,
      )
    }
  }

  return {}
}
