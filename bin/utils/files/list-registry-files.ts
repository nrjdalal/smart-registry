import { autoDetectPatterns } from "@/constants/orders"
import { listFiles } from "@/utils/files/list-files"

export const listRegistryFiles = async ({
  cwd,
  patterns,
  ignore,
}: {
  cwd: string
  patterns: string[]
  ignore: string | string[]
}): Promise<string[]> => {
  let registryFiles = [] as string[]

  if (!patterns.length) {
    for (const pattern of autoDetectPatterns) {
      registryFiles = await listFiles({
        cwd,
        patterns: pattern,
        ignore,
      })
      if (registryFiles.length) break
    }
  } else {
    registryFiles = await listFiles({
      cwd,
      patterns,
      ignore,
    })
  }

  if (!registryFiles.length) {
    throw new Error("No files/directories found to build the registry from!")
  }

  return registryFiles
}
