import fs, { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "tinyglobby"

/**
 * Codemod to rename camelCase filenames to kebab-case and update all import paths
 * Respects patterns in .gitignore
 * Usage: run this after your radix migration codemod
 */
export const codemodCamelToKebab = async ({ cwd }: { cwd: string }) => {
  // 1. Read .gitignore for ignore patterns
  const gitignorePath = path.resolve(cwd, ".gitignore")
  const ignore = existsSync(gitignorePath)
    ? (await readFile(gitignorePath, "utf8"))
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .map((line) => line.replace(/^\//, "").replace(/^/, "**/"))
    : []

  // 2. Find all JS/TS files, excluding ignored patterns
  const files = await glob(["**/*.{js,jsx,ts,tsx}"], { cwd, ignore })
  const renameMap: Record<string, string> = {}

  // 3. Rename files from camelCase to kebab-case
  for (const relPath of files) {
    const absPath = path.resolve(cwd, relPath)
    const ext = path.extname(relPath)
    const base = path.basename(relPath, ext)

    const kebab = base.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
    if (kebab !== base) {
      const newRel = path.join(path.dirname(relPath), kebab + ext)
      const newAbs = path.join(path.dirname(absPath), kebab + ext)

      await fs.promises.rename(absPath, newAbs)
      renameMap[relPath] = newRel
    }
  }

  // 4. Update imports and inline occurrences, respecting ignore
  const updatedFiles = await glob(["**/*.{js,jsx,ts,tsx}"], { cwd, ignore })
  for (const relPath of updatedFiles) {
    const absPath = path.resolve(cwd, relPath)
    let content = await fs.promises.readFile(absPath, "utf8")

    // Update import/require paths
    for (const [oldRel, newRel] of Object.entries(renameMap)) {
      const oldNoExt = oldRel.replace(/\.(js|jsx|ts|tsx)$/, "")
      const newNoExt = newRel.replace(/\.(js|jsx|ts|tsx)$/, "")
      const esc = oldNoExt.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&")
      const regex = new RegExp(`(["'\`])(${esc})(["'\`])`, "g")
      content = content.replace(
        regex,
        (_, open, p, close) => `${open}${newNoExt}${close}`,
      )
    }

    // Transform inline camelCase strings/identifiers
    content = content.replace(
      /([a-z])([A-Z])/g,
      (_, a, b) => `${a}-${b.toLowerCase()}`,
    )

    await fs.promises.writeFile(absPath, content, "utf8")
  }

  console.log(
    "CamelCase filenames and references have been converted to kebab-case, respecting .gitignore.",
  )
}
