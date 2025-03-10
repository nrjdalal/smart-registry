import fs from "node:fs"
import path from "node:path"
import { regex } from "@/constants/regex"
import { typeResolver } from "@/utils/resolvers"

export const dataResolver = async ({
  cwd,
  aliases,
  filepaths,
  resolved,
}: {
  cwd: string
  aliases: Record<string, string>
  filepaths: string[]
  resolved?: Set<string>
}) => {
  resolved = resolved ?? new Set<string>()

  const data = {
    dependencies: [] as string[],
    files: [] as string[],
    content: {} as Record<string, string>,
  }

  for (const filepath of filepaths) {
    if (resolved.has(filepath)) continue

    resolved.add(filepath)

    data.files.push(filepath)

    if (!data.content[filepath]) {
      data.content[filepath] = await fs.promises.readFile(
        path.resolve(cwd, filepath),
        "utf8",
      )
    }

    const { dependencies, files, transformations } = await typeResolver({
      cwd,
      aliases,
      filepath,
      content: data.content[filepath],
    })

    data.content[filepath] = data.content[filepath].replace(
      regex.imports,
      (current) => {
        const match = current.match(/['"](.*)['"]/)
        if (match && transformations[match[1]]) {
          return current.replace(match[1], transformations[match[1]].import)
        }
        return current
      },
    )

    files.forEach((file) => data.files.push(file))
    dependencies.forEach((dependency) => data.dependencies.push(dependency))
  }

  for (const filepath of data.files) {
    const { dependencies, files, content } = await dataResolver({
      cwd,
      aliases,
      filepaths: [filepath],
      resolved,
    })

    if (!data.content[filepath]) {
      data.content[filepath] =
        content[filepath] ||
        (await fs.promises.readFile(path.resolve(cwd, filepath), "utf8"))
    }

    files.forEach((file) => data.files.push(file))
    dependencies.forEach((dependency) => data.dependencies.push(dependency))
  }

  data.dependencies = [...new Set(data.dependencies)].sort()
  data.files = [...new Set(data.files)].sort()

  return data
}
