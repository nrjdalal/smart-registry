import fs, { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "tinyglobby"

/**
 * Codemod to rename camelCase filenames (and directories) to kebab-case
 * and update import paths accordingly.
 * Respects patterns in .gitignore
 * Only affects files and import statements (from "...") including aliased imports (@/*, @alias/*)
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

  // 3. Rename files and directories on disk
  for (const relPath of files) {
    const absPath = path.resolve(cwd, relPath)
    // use forward slash to split segments from glob
    const segments = relPath.split("/")
    const transformedSegments = segments.map((seg) => {
      const ext = path.extname(seg)
      const name = path.basename(seg, ext)
      const kebab = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      return kebab + ext
    })
    const newRel = transformedSegments.join("/")
    if (newRel !== relPath) {
      const newAbs = path.resolve(cwd, newRel)
      await fs.promises.mkdir(path.dirname(newAbs), { recursive: true })
      await fs.promises.rename(absPath, newAbs)
    }
  }

  // 4. Update import paths: camelCase -> kebab-case, including alias imports
  const postFiles = await glob(["**/*.{js,jsx,ts,tsx}"], { cwd, ignore })
  for (const relPath of postFiles) {
    const absPath = path.resolve(cwd, relPath)
    let content = await fs.promises.readFile(absPath, "utf8")

    content = content.replace(
      /(from\s+['"`])([^'"`]+)(['"`])/g,
      (_, p1, importPath, p3) => {
        interface ImportPathTransformer {
          (importPath: string): string
        }

        const transformImportPath: ImportPathTransformer = (importPath) =>
          importPath
            .split("/")
            .map((seg: string, index: number): string => {
              // preserve current/parent dirs
              if (seg === "." || seg === "..") return seg
              // preserve alias prefix (e.g., "@" or "@alias")
              if (index === 0 && seg.startsWith("@")) return seg
              return seg.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
            })
            .join("/")

        const transformed: string = transformImportPath(importPath)
        return `${p1}${transformed}${p3}`
      },
    )

    await fs.promises.writeFile(absPath, content, "utf8")
  }

  console.log(
    "✅ Filenames (and directories) and import paths converted to kebab-case, including aliased imports.",
  )
}
