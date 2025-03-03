import fs from "node:fs"
import path from "node:path"
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

export const getFiles = async ({
  patterns = ["**", ".**"] as string | string[],
  cwd = path.resolve(process.cwd()) as string,
  ignore = [] as string[],
} = {}) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  ignore = Array.isArray(ignore) ? ignore : [ignore]
  patterns = patterns.map((pattern) => {
    if (!pattern.endsWith("*")) {
      return pattern + "**"
    }
    return pattern
  })
  const files = await glob(patterns, {
    cwd,
    ignore: ignore.filter((ig) => !patterns.includes(ig)),
  })
  return files
}
