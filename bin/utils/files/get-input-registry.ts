import fs from "node:fs"
import path from "node:path"
import { transformer } from "@/utils/transformer"

export const getInputRegistry = async ({
  cwd,
  aliases,
  registryFiles,
}: {
  cwd: string
  aliases: Record<string, string>
  registryFiles: string[]
}): Promise<Record<string, any>> => {
  const inputRegistry = path.resolve(cwd, "registry.json")
  let registry: {
    $schema: string
    name: string
    homepage: string
    items: {
      name: string
      type: string
      files: {
        type: string
        path: string
      }[]
    }[]
  } = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "nrjdalal",
    homepage: "https://nrjdalal.com",
    items: [],
  }
  if (fs.existsSync(inputRegistry)) {
    registry = {
      ...JSON.parse(await fs.promises.readFile(inputRegistry, "utf8")),
    }
  }

  const uiFiles = [] as {
    type: string
    path: string
  }[]

  for (const filepath of registryFiles) {
    if (
      transformer({
        cwd,
        aliases,
        filepath,
      }).type === "registry:ui"
    ) {
      uiFiles.push({
        type: "registry:ui",
        path: filepath,
      })
    }
  }

  if (uiFiles.length) {
    registry.items.push({
      name: "ui",
      type: "registry:ui",
      files: uiFiles,
    })
  }

  return registry
}
