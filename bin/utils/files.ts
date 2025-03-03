import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"

export const findFile = (filepath: string) => {
  const isFile = path.extname(filepath) !== ""
  if (isFile) {
    return filepath
  } else {
    let folderPath = filepath.split(/\/|\\/).slice(0, -1).join(path.sep)
    folderPath = folderPath.replace(/\/\//g, "/")
    if (!fs.existsSync(folderPath)) return ""
    let files = fs.readdirSync(folderPath)
    files = files.map((file) => folderPath + path.sep + file)
    let file = files.find((file) => file.startsWith(filepath + "."))
    file = file?.replace(process.cwd() + path.sep, "")
    return file || ""
  }
}

export const getFiles = async ({
  patterns = ["**", ".**"],
  ignore = [] as string[],
} = {}) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  ignore = Array.isArray(ignore) ? ignore : [ignore]

  if (fs.existsSync(".gitignore")) {
    const gitignorePatterns: string[] = (
      await fs.promises.readFile(".gitignore", "utf8")
    )
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.replace(/^\//, ""))
    ignore = ignore.concat(gitignorePatterns)
  }

  return await glob(patterns, {
    ignore: ignore.filter((ig) => !patterns.includes(ig)),
  })
}
