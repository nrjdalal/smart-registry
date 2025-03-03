import fs from "node:fs"
import path from "node:path"
import { autoDetectPatterns } from "~/constants/orders"
import { glob } from "tinyglobby"

export const findFile = (filepath: string) => {
  const isFile = path.extname(filepath) !== ""
  if (isFile) {
    return filepath.replace(process.cwd() + path.sep, "")
  } else {
    let folderPath = filepath.split(/\/|\\/).slice(0, -1).join(path.sep)
    folderPath = folderPath.replace(/\/\//g, "/")
    if (!fs.existsSync(folderPath)) return ""
    let files = fs.readdirSync(folderPath)
    files = files.map((file) => folderPath + path.sep + file)
    let file = files.find((file) => file.startsWith(filepath + "."))
    file = file || files.find((file) => file.startsWith(filepath + "/index."))
    return file?.replace(process.cwd() + path.sep, "") || ""
  }
}

export const getInputRegistry = async (
  cwd: string,
): Promise<Record<string, any>> => {
  const inputRegistry = path.resolve(cwd, "registry.json")
  if (fs.existsSync(inputRegistry)) {
    return JSON.parse(await fs.promises.readFile(inputRegistry, "utf8"))
  }
  return {}
}

export const listFiles = async ({
  patterns = ["**", ".**"],
  ignore = [],
  cwd,
}: {
  patterns?: string | string[]
  ignore?: string | string[]
  cwd: string
}) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  patterns = patterns.flatMap((pattern) => {
    return !pattern.includes("*") ? [pattern + ".*", pattern + "/**"] : pattern
  })
  ignore = Array.isArray(ignore) ? ignore : [ignore]
  const files = await glob(patterns, {
    cwd,
    ignore: ignore.filter((ig) => !patterns.includes(ig)),
  })
  return files
}

export const listRegistryFiles = async ({
  cwd,
  patterns,
  ignore,
}: {
  cwd: string
  patterns: string[]
  ignore: string[]
}): Promise<string[]> => {
  let registryFiles = [] as string[]

  if (!patterns.length) {
    for (const pattern of autoDetectPatterns) {
      registryFiles = await listFiles({
        cwd,
        patterns: pattern,
        ignore,
      })
      if (registryFiles.length) break
    }
  } else {
    registryFiles = await listFiles({
      cwd,
      patterns,
      ignore,
    })
  }

  if (!registryFiles.length) {
    throw new Error("No files/directories found to build the registry from!")
  }

  return registryFiles
}
