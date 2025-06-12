import fs, { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "tinyglobby"

/**
 * Codemod to rename camelCase filenames to kebab-case and update import paths
 * Respects patterns in .gitignore
 * Only affects filenames and import statements (from "...")
 * Usage: run `codemodCamelToKebab({ cwd: projectRoot })`
 */
export const codemodCamelToKebab = async ({ cwd }: { cwd: string }) => {
  // 1. Read ignore patterns from .gitignore
  const gitignorePath = path.resolve(cwd, ".gitignore")
  const ignore = existsSync(gitignorePath)
    ? (await readFile(gitignorePath, "utf8"))
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("#"))
        .map((l) => l.replace(/^\//, "").replace(/^/, "**/"))
    : []

  // 2. Find all JS/TS files (respecting ignores)
  const files = await glob(["**/*.{js,jsx,ts,tsx}"], { cwd, ignore })
  const renameMap: Record<string, string> = {}

  // 3. Rename files on disk
  for (const relPath of files) {
    const absPath = path.resolve(cwd, relPath)
    const ext = path.extname(relPath)
    const base = path.basename(relPath, ext)
    const kebab = base.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    if (kebab !== base) {
      const newRel = path.join(path.dirname(relPath), `${kebab}${ext}`)
      const newAbs = path.resolve(cwd, newRel)
      await fs.promises.rename(absPath, newAbs)
      renameMap[relPath] = newRel
    }
  }

  // 4. Update import statements only
  const postFiles = await glob(["**/*.{js,jsx,ts,tsx}"], { cwd, ignore })
  for (const relPath of postFiles) {
    const absPath = path.resolve(cwd, relPath)
    let content = await fs.promises.readFile(absPath, "utf8")

    for (const [oldRel, newRel] of Object.entries(renameMap)) {
      const oldNoExt = oldRel.replace(/\.(j|t)sx?$/, "")
      const newNoExt = newRel.replace(/\.(j|t)sx?$/, "")
      // Escape regex special characters in oldNoExt
      const escapedOldNoExt = oldNoExt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const regex = new RegExp(
        `(from\\s+["'\\\`])${escapedOldNoExt}(["'\\\`])`,
        "g",
      )
      content = content.replace(regex, (_, p1, p2) => `${p1}${newNoExt}${p2}`)
    }

    await fs.promises.writeFile(absPath, content, "utf8")
  }

  console.log(
    "✅ CamelCase filenames and import paths converted to kebab-case.",
  )
}
