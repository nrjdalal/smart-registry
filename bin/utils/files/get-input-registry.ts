import fs from "node:fs"
import path from "node:path"

export const getInputRegistry = async (
  cwd: string,
): Promise<Record<string, any>> => {
  const inputRegistry = path.resolve(cwd, "registry.json")
  let registry = {
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
  return registry
}
