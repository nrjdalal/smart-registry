import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"

export const listFiles = async ({
  cwd,
  patterns = ["**", ".**"],
  ignore = [],
}: {
  cwd: string
  patterns?: string | string[]
  ignore?: string | string[]
}) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  patterns = patterns.map((pattern) =>
    pattern.replace(/^'|'$/g, "").replace(/^"|"$/g, "").trim(),
  )
  patterns = [
    ...patterns,
    ...patterns.flatMap((pattern) => {
      return !pattern.includes("*") ? [pattern + ".**", pattern + "**"] : []
    }),
  ]
  patterns = patterns.filter(Boolean)
  ignore =
    typeof ignore === "string"
      ? ignore.split(",").map((str) => str.trim())
      : ignore
  ignore = ignore.filter(Boolean)
  const files = await glob(patterns, {
    cwd,
    ignore: ignore.filter((ig) => !patterns.includes(ig)),
  })

  if (!files.length) {
    for (const pattern of patterns) {
      try {
        const fullPath = path.resolve(cwd, pattern)
        const stats = await fs.promises.stat(fullPath)
        if (stats.isDirectory()) {
          const dirFiles = (await fs.promises.readdir(fullPath)).map((file) =>
            path.resolve(pattern, file),
          )
          files.push(...dirFiles)
        } else if (stats.isFile()) {
          files.push(pattern)
        }
      } catch {
        continue
      }
    }
  }

  return files
}
