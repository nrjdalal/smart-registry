import fs from "node:fs"
import path from "node:path"

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
