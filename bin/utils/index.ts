import fs from "node:fs"
import path from "node:path"

export const findFile = (filepath: string) => {
  const isFile = path.extname(filepath) !== ""
  if (isFile) {
    return filepath
  } else {
    const folderPath = filepath.split(/\/|\\/).slice(0, -1).join(path.sep)
    if (!fs.existsSync(folderPath)) return ""
    let files = fs.readdirSync(folderPath)
    files = files.map((file) => folderPath + path.sep + file)
    const file = files.find((file) => file.startsWith(filepath + "."))
    return file || ""
  }
  // realPath =
  //   files.find((f) => f.startsWith(realPath + ".")) ||
  //   files.find((f) => f.startsWith(realPath + "/index")) ||
  //   realPath
}

export const resolvePath = (
  filepath: string,
  aliases: Record<string, string>,
) => {
  const sortedAliases = Object.entries(aliases).sort(
    ([aliasA], [aliasB]) => aliasB.length - aliasA.length,
  )
  return sortedAliases.reduce(
    (acc, [alias, realPath]) => acc.replace(alias, realPath),
    filepath,
  )
}
