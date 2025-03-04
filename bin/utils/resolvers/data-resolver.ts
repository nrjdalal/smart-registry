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

  for (let filepath of filepaths) {
    if (resolved.has(filepath)) {
      continue
    } else {
      resolved.add(filepath)
    }

    data.content[filepath] =
      data.content[filepath] || (await fs.promises.readFile(filepath, "utf8"))

    data.files.push(filepath)

    const imports = await typeResolver({
      cwd,
      aliases,
      content: data.content[filepath],
    })

    console.log(imports)
  }

  return data
}
