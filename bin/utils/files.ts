import fs from "node:fs"
import path from "node:path"
import { glob } from "tinyglobby"

export const getFiles = async ({
  patterns = ["**", ".**"],
  ignore = [] as string[],
} = {}) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  ignore = Array.isArray(ignore) ? ignore : [ignore]

  if (fs.existsSync(".gitignore")) {
    const gitignorePatterns: string[] = (
      await fs.promises.readFile(".gitignore", "utf8")
    )
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.replace(/^\//, ""))
    ignore = ignore.concat(gitignorePatterns)
  }

  return await glob(patterns, {
    ignore: ignore.filter((ig) => !patterns.includes(ig)),
  })
}

export const normalizeAndFilter = ({
  paths = [],
  directory = false,
  aliases = {},
  files = [],
}: {
  paths: string[]
  directory?: boolean
  aliases?: Record<string, string>
  files?: string[]
}): string[] => {
  return paths
    .map((path) => {
      path = path.replace(/^\.\//, "")
      for (const alias in aliases) {
        if (path.startsWith(alias)) {
          return path.replace(alias, aliases[alias])
        }
      }
      return path
    })
    .filter((path) => {
      if (directory) {
        return files.some((file) => file.startsWith(path))
      } else {
        return files.includes(path)
      }
    })
}

export const getImports = async ({
  filePath,
  aliases = {},
  files = [],
}: {
  filePath: string
  aliases?: Record<string, string>
  files?: string[]
}) => {
  const content: Record<string, string> = {}

  const data: { dependencies: string[]; files: string[] } = {
    dependencies: [],
    files: [],
  }

  const fileContent = content[filePath] || fs.readFileSync(filePath, "utf-8")

  content[filePath] = fileContent

  const importStatements = fileContent.match(
    /import\s+[\s\S]*?\s+from\s+['"].*['"]|import\s+['"].*['"]/g,
  )

  if (!importStatements) {
    data.files.push(filePath)
    content[filePath] = fileContent
    return { data, content }
  }

  const importFroms = importStatements
    .map((statement) => {
      const match = statement.match(/['"](.*)['"]/)
      return match ? match[1] : null
    })
    .filter((importFrom): importFrom is string => Boolean(importFrom))

  for (const importFrom of importFroms) {
    const aliasKey = Object.keys(aliases).find((key) =>
      importFrom.startsWith(key),
    )
    if (aliasKey) {
      let resolvedPath = path.join(
        aliases[aliasKey],
        importFrom.slice(aliasKey.length),
      )
      resolvedPath =
        files.find((file) => file.startsWith(resolvedPath + ".")) || ""
      if (!data.files.includes(resolvedPath)) {
        data.files.push(resolvedPath)
      }
    } else if (importFrom.startsWith(".")) {
      let resolvedPath = path.join(path.dirname(filePath), importFrom)
      resolvedPath = files.find((file) => file.startsWith(resolvedPath)) || ""
      if (!data.files.includes(resolvedPath)) {
        data.files.push(resolvedPath)
      }
    } else {
      const packageName = importFrom.startsWith("@")
        ? importFrom.split("/").slice(0, 2).join("/")
        : importFrom.split("/")[0]
      if (!data.dependencies.includes(packageName)) {
        data.dependencies.push(packageName)
      }
    }
  }

  const uniqueFiles = new Set(data.files)

  for (const file of uniqueFiles) {
    const importsData = await getImports({
      filePath: file,
      aliases,
      files,
    })
    content[file] = importsData.content[file]
    importsData.data.files.forEach((importFile) => uniqueFiles.add(importFile))
    importsData.data.dependencies.forEach((dependency) => {
      if (!data.dependencies.includes(dependency)) {
        data.dependencies.push(dependency)
      }
    })
  }

  data.files = [filePath, ...Array.from(uniqueFiles)]

  return { data, content }
}

export const normalizeImports = ({
  imports,
  aliases,
}: {
  imports: {
    content: Record<string, string>
    data: {
      files: string[]
      dependencies: string[]
    }
  }
  aliases: Record<string, string>
}) => {
  const cwd = path.basename(process.cwd())

  const normalizePath = (file: string) => {
    return file
      .replace(/^registry\/default\/components\//, `components/${cwd}/`)
      .replace(/^registry\/[^\/]+\/blocks\//, "blocks/")
      .replace(/^registry\/([^\/]+)\/components\//, "components/$1/")
      .replace(/^registry\/[^\/]+\/ui\//, "components/ui/")
      .replace(/^registry\/[^\/]+\/hooks\//, "hooks/")
      .replace(/^registry\/[^\/]+\/lib\//, "lib/")
  }

  const content = Object.fromEntries(
    Object.entries(imports.content).map(([key, value]) => {
      const aliasKey = Object.keys(aliases).find((alias) =>
        key.startsWith(aliases[alias]),
      )
      const normalizedKey = aliasKey ? key.replace(aliases[aliasKey], "") : key
      return [normalizePath(normalizedKey), value]
    }),
  )

  const target = imports.data.files.map((file: string) =>
    normalizePath(
      Object.keys(aliases).reduce(
        (acc, alias) => acc.replace(aliases[alias], ""),
        file,
      ),
    ),
  )

  const dependencies = imports.data.dependencies.filter(
    (dep) => !dep.startsWith("node:"),
  )

  const normalizedContent = Object.fromEntries(
    Object.entries(content).map(([key, value]) => {
      return [
        key,
        value
          .replace(/import\s+['"](.*)['"]/, (match, p1) => {
            const aliasKey = Object.keys(aliases).find((alias) =>
              p1.startsWith(alias),
            )
            if (aliasKey) {
              return `import "${p1.replace(aliasKey, aliases[aliasKey])}"`
            }
            return match
          })
          .replace(
            /@\/registry\/default\/components\//g,
            `@/components/${cwd}/`,
          )
          .replace(/@\/registry\/[^\/]+\/blocks\//g, "@/blocks/")
          .replace(/@\/registry\/([^\/]+)\/components\//g, "@/components/$1/")
          .replace(/@\/registry\/[^\/]+\/ui\//g, "@/components/ui/")
          .replace(/@\/registry\/[^\/]+\/hooks\//g, "@/hooks/")
          .replace(/@\/registry\/[^\/]+\/lib\//g, "@/lib/"),
      ]
    }),
  )

  return {
    content: normalizedContent,
    data: { dependencies, files: target, orignal: imports.data.files },
  }
}
