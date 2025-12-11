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
      // skip ALL_CAPS files like README.md, LICENSE, CLAUDE.md
      if (/^[A-Z0-9_]+$/.test(name)) return seg
      const kebab = name
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase()
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
        // skip ALL_CAPS segments in imports too
        if (/^[A-Z0-9_]+$/.test(seg)) return seg
        return seg
          .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
          .replace(/([a-z])([A-Z])/g, "$1-$2")
          .toLowerCase()
      })
      .join("/")
  }

  // 4. Update import + mock + CSS url paths in code
  const postFiles = await glob(["**/*.{js,jsx,ts,tsx,css,scss}"], {
    cwd,
    ignore,
  })
  console.log(`Checking ${postFiles.length} files for imports to update...`)

  for (const relPath of postFiles) {
    const absPath = path.resolve(cwd, relPath)
    let content = await fs.promises.readFile(absPath, "utf8")
    let changed = false

    // helper to replace and track changes
    const replacer = (_: string, p2: string) => {
      // DEBUG: Trace specific problem paths
      if (p2.includes("initDrizzle") || p2.includes("createStripeCli")) {
        console.log(`[DEBUG] File: ${relPath}`)
        console.log(`        Path: "${p2}"`)
        const computed = kebabifyPath(p2)
        console.log(`        -> "${computed}"`)
      }

      const newPath = kebabifyPath(p2)
      if (p2 !== newPath) {
        changed = true
        return newPath
      }
      return p2
    }

    // a1 & a2) Update imports using the project's standard regex (covers side-effects and type imports too)
    // Regex adapted from bin/constants/regex.ts
    const importRegex =
      /import\s+type\s+[\s\S]+?from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"]|import\s+[\s\S]+?from\s+['"][^'"]+['"]/g

    content = content.replace(importRegex, (statement) => {
      // Extract path: look for the last quoted string
      const match = statement.match(/['"]([^'"]+)['"]$/)
      if (!match) return statement

      const [quotedPath, rawPath] = match
      const newPath = replacer(statement, rawPath)

      // If no change, return original
      if (rawPath === newPath) return statement

      // Replace the path inside the statement (careful to replace only the path part)
      // We reconstruct the string to be safe
      return (
        statement.substring(0, statement.length - quotedPath.length) +
        quotedPath.replace(rawPath, newPath)
      )
    })

    /*
    // a1) update real imports: from "…"
    content = content.replace(
      /(from\s+['"`])([^'"`]+)(['"`])/g,
      (_full, p1, p2, p3) => `${p1}${replacer(_full, p2)}${p3}`,
    )

    // a2) update side-effect imports: import "…"
    content = content.replace(
      /(import\s+['"`])([^'"`]+)(['"`])/g,
      (_full, p1, p2, p3) => `${p1}${replacer(_full, p2)}${p3}`,
    )
    */

    // a3) update dynamic imports & require: import("…"), require("…")
    content = content.replace(
      /((?:import|require)\s*\(\s*['"`])([^'"`]+)(['"`]\s*\))/g,
      (_full, p1, p2, p3) => `${p1}${replacer(_full, p2)}${p3}`,
    )

    // b) update Vitest/Jest mock imports: vi.mock("…"), jest.mock("…")
    content = content.replace(
      /((?:vi|jest)\.(?:mock|importActual|requireActual)\(\s*['"`])([^'"`]+)(['"`])/g,
      (_full, p1, p2, p3) => `${p1}${replacer(_full, p2)}${p3}`,
    )

    // c) update CSS url() paths: url("…")
    content = content.replace(
      /(url\(\s*['"`]?)([^)'"`]+)(['"`]?\s*\))/g,
      (_full, p1, p2, p3) => `${p1}${replacer(_full, p2)}${p3}`,
    )

    if (changed) {
      await fs.promises.writeFile(absPath, content, "utf8")
    }
  }

  console.log(
    "✅ Filenames, import paths, and CSS url() assets converted to kebab-case via git mv (with case-only fallback).",
  )
}
