import { regex } from "@/constants/regex"
import { listFiles } from "../files"

export const typeResolver = async ({
  cwd,
  aliases,
  content,
}: {
  cwd: string
  aliases: Record<string, string>
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
    } else {
      data.dependencies.push(current)
    }
  }

  return data
}
