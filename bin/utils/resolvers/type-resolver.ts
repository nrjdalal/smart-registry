import { regex } from "@/constants/regex"

export const typeResolver = ({
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

      data.files.push(current)
    }
  }

  return data
}
