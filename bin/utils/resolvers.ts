import fs from "node:fs"
import path from "node:path"
import { findFile } from "@/bin/utils/files"
import { transformer } from "@/bin/utils/transformer"

export const pathResolver = (
  filepath: string,
  aliases: Record<string, string>,
) => {
  const sortedAliases = Object.entries(aliases).sort(
    ([aliasA], [aliasB]) => aliasB.length - aliasA.length,
  )
  return sortedAliases.reduce(
    (acc, [alias, realPath]) => acc.replace(alias, realPath),
    filepath,
  )
}

export const resolver = async (
  filePaths: string[],
  options: {
    aliases?: Record<string, string>
    resolved?: Set<string>
  } = {},
) => {
  const { aliases = {}, resolved = new Set<string>() } = options

  const data = {
    dependencies: [] as string[],
    files: [] as string[],
    content: {} as Record<string, string>,
  }

  // ~ Resolve data for each file
  for (const filePath of filePaths) {
    if (resolved.has(filePath)) {
      continue
    } else {
      resolved.add(filePath)
    }

    data.files.push(filePath)

    data.content[filePath] =
      data.content[filePath] || (await fs.promises.readFile(filePath, "utf8"))

    // ~ Extract import statements from the file content
    const importStatements = data.content[filePath].match(
      /import\s+[\s\S]+?from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"]|import\s+type\s+[\s\S]+?from\s+['"][^'"]+['"]/g,
    )

    if (!importStatements) continue

    const imports = importStatements.map(
      (statement) => statement.match(/['"](.*)['"]/)?.[1] as string,
    )

    // ~ Resolve dependencies, files, and content for each import
    for (const importAddress of imports) {
      const isAliased = Object.keys(aliases).some((alias) =>
        importAddress.startsWith(alias),
      )

      if (isAliased) {
        let realPath = pathResolver(importAddress, aliases)
        realPath = findFile(realPath)
        if (realPath && !data.files.includes(realPath))
          data.files.push(realPath)
      } else if (importAddress.startsWith(".")) {
        let realPath = path.resolve(path.dirname(filePath), importAddress)
        realPath = findFile(realPath)
        if (realPath && !data.files.includes(realPath))
          data.files.push(realPath)
      } else {
        const ignoredDeps = ["fs", "path", "util"]
        let pkg = importAddress.split("/").slice(0, 2).join("/")
        pkg = pkg.startsWith("@") ? pkg : pkg.split("/")[0]
        const isValidPackage = /^[a-zA-Z0-9@/-]+$/.test(pkg)
        if (
          isValidPackage &&
          !ignoredDeps.includes(pkg) &&
          !data.dependencies.includes(pkg)
        ) {
          data.dependencies.push(pkg)
        }
      }
    }
  }

  // ~ Recursively resolve data for new files
  for (const file of data.files) {
    const newData = await resolver([file], {
      aliases,
      resolved,
    })
    newData.dependencies.forEach((dep) => {
      if (!data.dependencies.includes(dep)) data.dependencies.push(dep)
    })
    newData.files.forEach((file) => {
      if (!data.files.includes(file)) data.files.push(file)
    })
    data.content[file] =
      newData.content[file] || (await fs.promises.readFile(file, "utf8"))
  }

  // ~ Replace import statements with transformed import paths
  for (const file of data.files) {
    data.content[file] = data.content[file].replace(
      /import\s+[\s\S]+?from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"]|import\s+type\s+[\s\S]+?from\s+['"][^'"]+['"]/g,
      (statement) => {
        const importAddress = statement.match(/['"](.*)['"]/)?.[1] as string
        const isAliased = Object.keys(aliases).some((alias) =>
          importAddress.startsWith(alias),
        )
        if (isAliased) {
          const realPath = pathResolver(importAddress, aliases)
          const transformedPath = transformer(realPath, {
            aliases,
          })?.import
          return statement.replace(importAddress, transformedPath)
        } else if (importAddress.startsWith(".")) {
          const realPath = path.resolve(path.dirname(file), importAddress)
          const transformedPath = transformer(realPath, {
            aliases,
          })?.import
          return statement.replace(importAddress, transformedPath)
        } else {
          return statement
        }
      },
    )
  }

  // ~ Sort dependencies and files
  data.dependencies.sort()
  data.files.sort((a, b) =>
    transformer(a, {
      aliases,
    }).target.localeCompare(
      transformer(b, {
        aliases,
      }).target,
    ),
  )
  data.files.sort((a, b) => {
    const typeOrder = [
      "registry:file",
      "registry:block",
      "registry:component",
      "registry:ui",
      "registry:hook",
      "registry:lib",
    ]
    const typeA = transformer(a, {
      aliases,
    }).type
    const typeB = transformer(b, {
      aliases,
    }).type
    return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB)
  })

  return data
}
