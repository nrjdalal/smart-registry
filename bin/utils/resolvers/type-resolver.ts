import fs from "node:fs"
import path from "node:path"
import { regex } from "@/constants/regex"
import { listFiles } from "@/utils/files"
import { transformer } from "@/utils/transformer"

export const resolveAliasedImport = async ({
  cwd,
  current,
  aliases,
}: {
  cwd: string
  aliases: Record<string, string>
  current: string
}) => {
  current = current.replace(
    new RegExp(
      `^${Object.keys(aliases).find((alias) => current.startsWith(alias.replace(/\.\//g, "").replace(/\.\.\//g, "")))}`,
    ),
    aliases[
      Object.keys(aliases).find((alias) =>
        current.startsWith(alias.replace(/\.\//g, "").replace(/\.\.\//g, "")),
      ) as string
    ],
  )
  current = current.replace(/\.\//g, "").replace(/\.\.\//g, "")
  const files = await listFiles({ cwd, patterns: current })
  current =
    files.find((file) => file.startsWith(current + ".")) ||
    files.find((file) => file.startsWith(current + "/index")) ||
    current
  return current.replace(cwd + "/", "")
}

export const resolveRelativeImport = async ({
  cwd,
  filepath,
  current,
}: {
  cwd: string
  filepath: string
  current: string
}) => {
  current = path.relative(
    cwd,
    path.resolve(cwd, path.dirname(filepath as string), current),
  )
  const files = await listFiles({ cwd, patterns: current })
  current =
    files.find((file) => file.startsWith(current + ".")) ||
    files.find((file) => file.startsWith(current + "/index")) ||
    current
  return current.replace(cwd + "/", "")
}

export const typeResolver = async ({
  cwd,
  aliases,
  filepath,
  content,
}: {
  cwd: string
  aliases: Record<string, string>
  filepath: string
  content: string
}) => {
  const data = {
    dependencies: [] as string[],
    devDependencies: [] as string[],
    files: [] as string[],
    transformations: {} as Record<string, any>,
  }

  let imports: string[] = content.match(regex.imports) || []
  if (!imports.length) return data

  imports = imports.map(
    (statement) =>
      statement.match(/['"](.*)['"]/)?.[1].replace(/\/\//g, "/") as string,
  )

  for (let current of imports) {
    let orignal = current

    const isAliased = Object.keys(aliases).some((alias) =>
      current.startsWith(alias.replace(/\.\//g, "").replace(/\.\.\//g, "")),
    )

    if (isAliased) {
      current = await resolveAliasedImport({ cwd, aliases, current })
      data.transformations[orignal] = transformer({
        cwd,
        aliases,
        filepath: current,
      })
      data.files.push(current)
    } else if (current.startsWith(".")) {
      current = await resolveRelativeImport({ cwd, filepath, current })
      data.transformations[orignal] = transformer({
        cwd,
        aliases,
        filepath: current,
      })
      data.files.push(current)
    } else {
      const packageJsonPath = path.resolve(cwd, "package.json")
      let dependencies: Record<string, string> = {}
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = await fs.promises.readFile(packageJsonPath, "utf8")
        const packageJsonData = JSON.parse(packageJson)
        dependencies = {
          ...(packageJsonData.dependencies || {}),
        }
      }
      if (current.startsWith("@")) {
        const name = current.split("/").slice(0, 2).join("/")
        if (dependencies[name]) data.dependencies.push(name)
        else data.devDependencies.push(name)
      } else {
        const name = current.split("/")[0]
        if (dependencies[name]) data.dependencies.push(name)
        else data.devDependencies.push(name)
      }
    }
  }

  return data
}
