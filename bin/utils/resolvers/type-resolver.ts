import path from "node:path"
import { regex } from "@/constants/regex"
import { listFiles } from "@/utils/files"

const resolveAliasedImport = async ({
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
      `^${Object.keys(aliases).find((alias) => current.startsWith(alias))}`,
    ),
    aliases[
      Object.keys(aliases).find((alias) => current.startsWith(alias)) as string
    ],
  )
  const files = await listFiles({ cwd, patterns: current })
  current =
    files.find((file) => file.startsWith(current + ".")) ||
    files.find((file) => file.startsWith(current + "/index")) ||
    current
  return current.replace(cwd + "/", "")
}

const resolveRelativeImport = async ({
  cwd,
  filepath,
  current,
}: {
  cwd: string
  filepath: string
  current: string
}) => {
  current = path.resolve(cwd, path.dirname(filepath as string), current)
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
  const data = { dependencies: [] as string[], files: [] as string[] }
  let imports: string[] = content.match(regex.imports) || []
  if (!imports.length) return data

  imports = imports.map(
    (statement) => statement.match(/['"](.*)['"]/)?.[1] as string,
  )

  for (let current of imports) {
    const isAliased = Object.keys(aliases).some((alias) =>
      current.startsWith(alias),
    )

    if (isAliased) {
      current = await resolveAliasedImport({ cwd, aliases, current })
      data.files.push(current)
    } else if (current.startsWith(".")) {
      current = await resolveRelativeImport({ cwd, filepath, current })
      data.files.push(current)
    } else {
      if (current.startsWith("@")) {
        data.dependencies.push(current.split("/").slice(0, 2).join("/"))
      } else {
        data.dependencies.push(current.replace(/\/.*/, ""))
      }
    }
  }

  return data
}
