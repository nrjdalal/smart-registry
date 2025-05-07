import { autoDetectPatterns } from "@/constants/orders"
import { listFiles } from "@/utils/files/list-files"

export const listRegistryFiles = async ({
  cwd,
  patterns,
  ignore,
  patternsOnly,
}: {
  cwd: string
  patterns: string[]
  ignore: string | string[]
  patternsOnly: boolean
}): Promise<string[]> => {
  let registryFiles = [] as string[]

  if (!patternsOnly) {
    for (const pattern of autoDetectPatterns) {
      registryFiles = await listFiles({
        cwd,
        patterns: pattern,
        ignore,
      })
      if (registryFiles.length) break
    }
  }

  if (patterns.length) {
    registryFiles = registryFiles.concat(
      await listFiles({
        cwd,
        patterns,
        ignore,
      }),
    )
  }

  if (!registryFiles.length) {
    throw new Error("No files/directories found to build the registry from!")
  }

  registryFiles = registryFiles
    .sort((a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    )
    .filter(
      (file: string) =>
        !file.startsWith("registry/registry") &&
        !file.startsWith("registry/index") &&
        !file.startsWith("src/registry/registry") &&
        !file.startsWith("src/registry/index"),
    )

  return registryFiles
}
