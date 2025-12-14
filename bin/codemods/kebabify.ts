import { existsSync } from "node:fs"
import { readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { getAliases } from "@/utils/aliases"
import { glob } from "tinyglobby"

const toKebabCase = (str: string) => {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
}

const kebabifyPath = (filePath: string) => {
  const parts = filePath.split("/")
  return parts.map(toKebabCase).join("/")
}

export const codemodKebabify = async ({ cwd }: { cwd: string }) => {
  const gitignorePath = path.resolve(cwd, ".gitignore")
  const ignore = existsSync(gitignorePath)
    ? (await readFile(gitignorePath, "utf8"))
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .map((line) => line.replace(/^\//, "").replace(/^/, "**/"))
    : []

  const files = await glob(
    ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.css", "**/*.json"],
    {
      cwd,
      ignore: [...ignore, "**/node_modules/**", "**/.git/**", "**/dist/**"],
      absolute: true,
    },
  )

  const aliases = await getAliases(cwd)
  const aliasKeys = Object.keys(aliases)

  // 1. Update imports in all files
  for (const file of files) {
    if (file.endsWith(".json")) continue // Skip JSON for imports, but we might need to rename them

    const content = await readFile(file, "utf8")

    // Regex for imports/exports
    // Matches: import ... from "..." or export ... from "..." or import "..."
    // Also handling dynamic imports import("...") is harder with regex, let's stick to static for now as per common codemods

    const newContent = content
      .replace(
        /(from\s+["'])([^"']+)("|')/g,
        (match, prefix, importPath, suffix) => {
          // Check if local or alias
          const isLocal =
            importPath.startsWith(".") || importPath.startsWith("/")
          const isAlias = aliasKeys.some((alias) =>
            importPath.startsWith(alias),
          )

          if (!isLocal && !isAlias) {
            return match
          }

          return `${prefix}${kebabifyPath(importPath)}${suffix}`
        },
      )
      .replace(
        /(import\s+["'])([^"']+)("|')/g, // Side-effect imports
        (match, prefix, importPath, suffix) => {
          // Check if local or alias
          const isLocal =
            importPath.startsWith(".") || importPath.startsWith("/")
          const isAlias = aliasKeys.some((alias) =>
            importPath.startsWith(alias),
          )

          if (!isLocal && !isAlias) {
            return match
          }

          return `${prefix}${kebabifyPath(importPath)}${suffix}`
        },
      )

    if (content !== newContent) {
      await writeFile(file, newContent, "utf8")
    }
  }

  // 2. Rename files and directories
  // We need to collect all files and directories that need renaming.
  // Since we have `files`, we can derive directories.

  const allPaths = new Set<string>()
  for (const file of files) {
    let current = path.relative(cwd, file)
    while (current !== "." && current !== "") {
      allPaths.add(path.resolve(cwd, current))
      current = path.dirname(current)
    }
  }

  const sortedPaths = Array.from(allPaths).sort((a, b) => b.length - a.length)

  for (const p of sortedPaths) {
    const dir = path.dirname(p)
    const base = path.basename(p)
    const newBase = toKebabCase(base)

    if (base !== newBase) {
      const newPath = path.join(dir, newBase)
      try {
        await rename(p, newPath)
        console.log(
          `Renamed: ${path.relative(cwd, p)} -> ${path.relative(cwd, newPath)}`,
        )
      } catch (error) {
        console.error(`Failed to rename ${p} to ${newPath}:`, error)
      }
    }
  }

  console.log("\nKebabify codemod completed successfully.")
}
