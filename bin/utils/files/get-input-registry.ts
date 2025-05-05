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
      files?: {
        type: string
        path: string
      }[]
      cssVars?: {
        light: Record<string, string>
        dark: Record<string, string>
      }
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

  let light:
    | {
        name: string
        value: string
      }[]
    | null = null

  let dark:
    | {
        name: string
        value: string
      }[]
    | null = null

  const globalCssPath = fs.existsSync(
    path.relative(process.cwd(), path.resolve(cwd, "app/globals.css")),
  )
    ? path.relative(process.cwd(), path.resolve(cwd, "app/globals.css"))
    : fs.existsSync(
          path.relative(
            process.cwd(),
            path.resolve(cwd, "src/app/globals.css"),
          ),
        )
      ? path.relative(process.cwd(), path.resolve(cwd, "src/app/globals.css"))
      : null

  if (globalCssPath) {
    const globalCss = await fs.promises.readFile(globalCssPath, "utf8")
    const lightMatch = globalCss.match(/:root\s*{([^}]*)}/)
    light = lightMatch
      ? lightMatch[1]
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .split(";")
          .map((v) => v.trim())
          .filter((v) => v.length)
          .map((v) => {
            const [name, value] = v.split(":").map((v) => v.trim())
            return {
              name: name.replace(/^--/, ""),
              value,
            }
          })
      : null
    const darkMatch = globalCss.match(/\.dark\s*{([^}]*)}/)
    dark = darkMatch
      ? darkMatch[1]
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .split(";")
          .map((v) => v.trim())
          .filter((v) => v.length)
          .map((v) => {
            const [name, value] = v.split(":").map((v) => v.trim())
            return {
              name: name.replace(/^--/, ""),
              value,
            }
          })
      : null
  }

  if (light && dark) {
    registry.items.push({
      name: "style",
      type: "registry:style",
      cssVars: {
        light: Object.fromEntries(light.map((v) => [v.name, v.value])),
        dark: Object.fromEntries(dark.map((v) => [v.name, v.value])),
      },
    })
  }

  if (uiFiles.length) {
    registry.items.push({
      name: "ui",
      type: "registry:ui",
      files: uiFiles,
      ...(light && dark
        ? {
            cssVars: {
              light: Object.fromEntries(light.map((v) => [v.name, v.value])),
              dark: Object.fromEntries(dark.map((v) => [v.name, v.value])),
            },
          }
        : {}),
    })
  }

  return registry
}
