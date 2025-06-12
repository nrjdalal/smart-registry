import fs, { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "tinyglobby"

/**
 * Codemod to rename camelCase filenames (and directories) to kebab-case
 * and update import paths accordingly.
 * Respects patterns in .gitignore
 * Only affects files and import statements (from "…") including aliased imports (@/*, @alias/*) and Vitest mocks
 * Skips segments starting with uppercase (PascalCase) like App.tsx
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

  ignore.push("tailwind.config.js")
  ignore.push("tailwind.config.ts")

  // 2. Find all files (respecting ignores)
  const files = await glob(
    ["**/*.css", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    {
      cwd,
      ignore,
    },
  )

  // 3. Rename files and directory segments on disk
  for (const relPath of files) {
    const absPath = path.resolve(cwd, relPath)
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

  // helper to kebab-case a single path string
  function kebabifyPath(importPath: string) {
    return importPath
      .split("/")
      .map((seg, i) => {
        // preserve current/parent dirs
        if (seg === "." || seg === "..") return seg
        // preserve alias prefix (e.g., "@" or "@alias")
        if (i === 0 && seg.startsWith("@")) return seg
        return seg.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      })
      .join("/")
  }

  // 4. Update import + mock paths
  const postFiles = await glob(["**/*.{js,jsx,ts,tsx}"], { cwd, ignore })
  for (const relPath of postFiles) {
    const absPath = path.resolve(cwd, relPath)
    let content = await fs.promises.readFile(absPath, "utf8")

    // a) update real imports: from "…"
    content = content.replace(
      /(from\s+['"`])([^'"`]+)(['"`])/g,
      (_: string, p1: string, p2: string, p3: string) =>
        `${p1}${kebabifyPath(p2)}${p3}`,
    )

    // b) update Vitest mock imports: vi.mock("…") and vi.importActual("…")
    content = content.replace(
      /(vi\.(?:mock|importActual)\(\s*['"`])([^'"`]+)(['"`])/g,
      (_: string, p1: string, p2: string, p3: string) =>
        `${p1}${kebabifyPath(p2)}${p3}`,
    )

    await fs.promises.writeFile(absPath, content, "utf8")
  }

  console.log(
    "✅ Filenames (and directories) and import + mock paths converted to kebab-case, skipping PascalCase segments.",
  )
}
