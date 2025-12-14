import fs, { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { regex } from "@/constants/regex"
import { getAliases } from "@/utils/aliases"
import { execa } from "execa"
import { glob } from "tinyglobby"

export const codemodCamelToKebab = async ({ cwd }: { cwd: string }) => {
  const aliases = await getAliases(cwd)

  // 1. Get all files that are not ignored and are not in .git
  const gitignorePath = path.resolve(cwd, ".gitignore")
  const ignorePatterns = existsSync(gitignorePath)
    ? (await readFile(gitignorePath, "utf8"))
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .map((line) => line.replace(/^\//, "").replace(/^/, "**/"))
    : []

  // Always ignore .git and node_modules
  ignorePatterns.push("**/.git/**", "**/node_modules/**")

  const files = await glob(["**/*"], {
    cwd,
    ignore: ignorePatterns,
    absolute: true,
    onlyFiles: true,
    dot: true,
  })

  // Helper: Kebab-case a string
  // - camelCase -> camel-case
  // - PascalCase -> pascal-case
  // - XMLHttpRequest -> xml-http-request
  // - HTTPServer -> http-server
  // - CAPITAL.ext -> CAPITAL.ext
  const toKebabCase = (str: string) => {
    const name = path.basename(str, path.extname(str))
    if (/^[A-Z0-9_]+$/.test(name)) return str

    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
      .toLowerCase()
  }

  // Helper: Kebab-case a path (preserving structure and @aliases)
  const kebabifyPath = (filePath: string) => {
    // Check if path starts with an alias
    const matchedAlias = Object.keys(aliases).find((alias) =>
      filePath.startsWith(alias.replace(/\.\//g, "").replace(/\.\.\//g, "")),
    )

    if (matchedAlias) {
      const cleanAlias = matchedAlias
        .replace(/\.\//g, "")
        .replace(/\.\.\//g, "")
      const rest = filePath.slice(cleanAlias.length)

      return (
        cleanAlias +
        rest
          .split("/")
          .map((part) => toKebabCase(part))
          .join("/")
      )
    }

    const parts = filePath.split("/")
    return parts
      .map((part) => {
        if (part === "." || part === "..") return part
        // Preserve segments starting with @ (aliases or scopes)
        if (part.startsWith("@")) return part
        return toKebabCase(part)
      })
      .join("/")
  }

  // Helper: check if path should be replaced (only relative or aliased)
  const shouldReplace = (oldPath: string) => {
    // Check if it's a relative path
    if (oldPath.startsWith(".") || oldPath.startsWith("/")) return true

    // Check if it matches any alias
    return Object.keys(aliases).some((alias) =>
      oldPath.startsWith(alias.replace(/\.\//g, "").replace(/\.\.\//g, "")),
    )
  }

  // Helper: replace path if needed
  const getNewPath = (oldPath: string) => {
    if (!shouldReplace(oldPath)) return oldPath
    return kebabifyPath(oldPath)
  }

  console.log(`Found ${files.length} files. Processing content...`)

  // 2. Kebabify all paths in the files
  for (const file of files) {
    let content = await readFile(file, "utf8")
    const originalContent = content

    // a) Update imports using the project's standard regex
    content = content.replace(regex.imports, (statement) => {
      const match = statement.match(/['"]([^'"]+)['"]$/)
      if (!match) return statement

      const [quotedPath, rawPath] = match
      const newPath = getNewPath(rawPath)

      if (newPath === rawPath) return statement

      return (
        statement.substring(0, statement.length - quotedPath.length) +
        quotedPath.replace(rawPath, newPath)
      )
    })

    // b) Update dynamic imports & require: import("…"), require("…")
    content = content.replace(
      /((?:import|require)\s*\(\s*['"`])([^'"`]+)(['"`]\s*\))/g,
      (_full, p1, p2, p3) => `${p1}${getNewPath(p2)}${p3}`,
    )

    // c) Update Vitest/Jest mock imports: vi.mock("…"), jest.mock("…")
    content = content.replace(
      /((?:vi|jest)\.(?:mock|importActual|requireActual)\(\s*['"`])([^'"`]+)(['"`])/g,
      (_full, p1, p2, p3) => `${p1}${getNewPath(p2)}${p3}`,
    )

    // d) Update CSS url() paths: url("…")
    content = content.replace(
      /(url\(\s*['"`]?)([^)'"`]+)(['"`]?\s*\))/g,
      (_full, p1, p2, p3) => `${p1}${getNewPath(p2)}${p3}`,
    )

    if (content !== originalContent) {
      await writeFile(file, content, "utf8")
    }
  }

  console.log("Renaming files...")

  // 3. Rename all files using git rename kebabified
  for (const file of files) {
    const relPath = path.relative(cwd, file)
    const newRelPath = kebabifyPath(relPath)

    if (relPath !== newRelPath) {
      const newAbsPath = path.resolve(cwd, newRelPath)
      const newDir = path.dirname(newAbsPath)

      if (!existsSync(newDir)) {
        await mkdir(newDir, { recursive: true })
      }

      try {
        // Handle case-only renames
        if (relPath.toLowerCase() === newRelPath.toLowerCase()) {
          const tempPath = `${file}.temp-rename`
          await execa("git", ["mv", file, tempPath], { cwd, stdio: "ignore" })
          await execa("git", ["mv", tempPath, newAbsPath], {
            cwd,
            stdio: "ignore",
          })
        } else {
          await execa("git", ["mv", file, newAbsPath], { cwd, stdio: "ignore" })
        }
      } catch {
        // Fallback to fs.rename
        try {
          const { rename } = fs.promises
          if (relPath.toLowerCase() === newRelPath.toLowerCase()) {
            const tempPath = `${file}.temp-rename`
            await rename(file, tempPath)
            await rename(tempPath, newAbsPath)
          } else {
            await rename(file, newAbsPath)
          }
        } catch (fsErr) {
          console.error(`Failed to rename ${relPath} to ${newRelPath}`, fsErr)
        }
      }
    }
  }
}
