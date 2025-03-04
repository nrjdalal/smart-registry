import path from "node:path"
import { regex } from "@/constants/regex"
import { listFiles } from "../files"

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
    files: [] as string[],
  }

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
      current = current.replace(
        new RegExp(
          `^${Object.keys(aliases).find((alias) => current.startsWith(alias))}`,
        ),
        aliases[
          Object.keys(aliases).find((alias) =>
            current.startsWith(alias),
          ) as string
        ],
      )

      const files = await listFiles({
        cwd,
        patterns: current,
      })

      current =
        files.find((file) => file.includes(current + ".")) ||
        files.find((file) => file.includes(current + "/index")) ||
        current

      data.files.push(current)
    } else if (current.startsWith(".")) {
      current = path.resolve(cwd, path.dirname(filepath), current)

      const files = await listFiles({
        cwd,
        patterns: current,
      })

      current =
        files.find((file) => file.includes(current + ".")) ||
        files.find((file) => file.includes(current + "/index")) ||
        current

      current = current.replace(cwd + "/", "")

      data.files.push(current)
    } else {
      if (current.startsWith("@")) {
        data.dependencies.push(
          current.replace(/['"]+/g, "").split("/").slice(0, 2).join("/"),
        )
      } else {
        data.dependencies.push(
          current.replace(/['"]+/g, "").replace(/\/.*/, ""),
        )
      }
    }
  }

  return data
}
