import fs from "node:fs"
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
    if (resolved.has(filepath)) {
      continue
    } else {
      resolved.add(filepath)
    }

    data.files.push(filepath)
    data.content[filepath] =
      data.content[filepath] || (await fs.promises.readFile(filepath, "utf8"))

    const { dependencies, files } = await typeResolver({
      cwd,
      aliases,
      filepath,
      content: data.content[filepath],
    })
    data.dependencies.push(
      ...dependencies.filter(
        (dependency) => !data.dependencies.includes(dependency),
      ),
    )
    data.files.push(...files.filter((file) => !data.files.includes(file)))
  }

  for (const file of data.files) {
    if (!resolved.has(file)) {
      const { dependencies, files } = await dataResolver({
        cwd,
        aliases,
        filepaths: [file],
        resolved,
      })
      data.dependencies.push(
        ...dependencies.filter(
          (dependency) => !data.dependencies.includes(dependency),
        ),
      )
      data.files.push(...files.filter((file) => !data.files.includes(file)))
      data.content[file] =
        data.content[file] || (await fs.promises.readFile(file, "utf8"))
    }
  }

  return data
}
