import { execSync } from "node:child_process"
import fs, { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { glob } from "tinyglobby"

/**
 * Codemod to rename camelCase filenames (and directories) to kebab-case
 * and update import paths accordingly.
 * Respects patterns in .gitignore
 * Only affects files and import statements (from "…") including aliased imports (@/*, @alias/*), Vitest mocks, and CSS url() paths
 * Usage: run `codemodCamelToKebab({ cwd: projectRoot })`
 */
export const codemodCamelToKebab = async ({ cwd }: { cwd: string }) => {
  // helper: use Git to rename (handles case-only renames via a temp intermediate)
  function gitMv(oldPath: string, newPath: string) {
    const oldLower = oldPath.toLowerCase()
    const newLower = newPath.toLowerCase()
    const isCaseOnly = oldLower === newLower && oldPath !== newPath

    try {
      // case-insensitive FS: if only case differs, go via a temp file
      if (isCaseOnly) {
        const tmpPath = `${oldPath}.tmp-case-rename`
        execSync(`git mv "${oldPath}" "${tmpPath}"`, { stdio: "pipe" })
        execSync(`git mv "${tmpPath}" "${newPath}"`, { stdio: "pipe" })
      } else {
        execSync(`git mv "${oldPath}" "${newPath}"`, { stdio: "pipe" })
      }
    } catch {
      // Fallback to fs.rename if git mv fails (e.g. untracked file)
      if (isCaseOnly) {
        const tmpPath = `${oldPath}.tmp-case-rename`
        fs.renameSync(oldPath, tmpPath)
        fs.renameSync(tmpPath, newPath)
      } else {
        fs.renameSync(oldPath, newPath)
      }
    }
  }

  // 1. Read ignore patterns from .gitignore
  const gitignorePath = path.resolve(cwd, ".gitignore")
  const ignore = existsSync(gitignorePath)
    ? (await readFile(gitignorePath, "utf8"))
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .map((line) => line.replace(/^\//, "").replace(/^/, "**/"))
    : []
  ignore.push("tailwind.config.js", "tailwind.config.ts")

  // 2. Find all files (respecting ignores)
  const files = await glob(["**/*"], {
    cwd,
    ignore,
  })

  // 3. Rename files and directory segments on disk using `git mv`
  for (const relPath of files) {
    const absPath = path.resolve(cwd, relPath)
    const segments = relPath.split("/")
    const transformed = segments.map((seg) => {
      const ext = path.extname(seg)
      const name = path.basename(seg, ext)
      const kebab = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      return `${kebab}${ext}`
    })
    const newRel = transformed.join("/")
    if (newRel !== relPath) {
      const newAbs = path.resolve(cwd, newRel)
      await fs.promises.mkdir(path.dirname(newAbs), { recursive: true })
      gitMv(absPath, newAbs)
    }
  }

  // helper to kebab-case a single path string
  function kebabifyPath(importPath: string) {
    return importPath
      .split("/")
      .map((seg, i) => {
        if (seg === "." || seg === "..") return seg
        if (i === 0 && seg.startsWith("@")) return seg
        return seg.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
      })
      .join("/")
  }

  // 4. Update import + mock + CSS url paths in code
  const postFiles = await glob(["**/*.{js,jsx,ts,tsx,css,scss}"], {
    cwd,
    ignore,
  })
  for (const relPath of postFiles) {
    const absPath = path.resolve(cwd, relPath)
    let content = await fs.promises.readFile(absPath, "utf8")

    // a) update real imports: from "…"
    content = content.replace(
      /(from\s+['"`])([^'"`]+)(['"`])/g,
      (_full, p1, p2, p3) => `${p1}${kebabifyPath(p2)}${p3}`,
    )

    // b) update Vitest mock imports: vi.mock("…") & vi.importActual("…")
    content = content.replace(
      /(vi\.(?:mock|importActual)\(\s*['"`])([^'"`]+)(['"`])/g,
      (_full, p1, p2, p3) => `${p1}${kebabifyPath(p2)}${p3}`,
    )

    // c) update CSS url() paths: url("…")
    content = content.replace(
      /(url\(\s*['"`]?)([^)'"`]+)(['"`]?\s*\))/g,
      (_full, p1, p2, p3) => `${p1}${kebabifyPath(p2)}${p3}`,
    )

    await fs.promises.writeFile(absPath, content, "utf8")
  }

  console.log(
    "✅ Filenames, import paths, and CSS url() assets converted to kebab-case via git mv (with case-only fallback).",
  )
}
