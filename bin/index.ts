#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { getAliases } from "@/bin/utils/aliases"
import {
  getFiles,
  getImports,
  normalizeAndFilter,
  normalizeImports,
} from "@/bin/utils/files"
import { author, name, version } from "@/package.json"

const helpMessage = `Version:
  ${name}@${version}

Usage:
  $ ${name} [options]

Options:
  -v, --version  Display version
  -h, --help     Display help

Author:
  ${author.name} <${author.email}> (${author.url})`

const parse: typeof parseArgs = (config) => {
  try {
    return parseArgs(config)
  } catch (err: any) {
    throw new Error(`Error parsing arguments: ${err.message}`)
  }
}

const main = async () => {
  try {
    const { positionals, values } = parse({
      allowPositionals: true,
      options: {
        files: { type: "string", multiple: true, short: "f" },
        directories: { type: "string", multiple: true, short: "d" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    })

    if (!positionals.length) {
      if (values.version) {
        console.log(`${name}@${version}`)
        process.exit(0)
      }
      if (values.help) {
        console.log(helpMessage)
        process.exit(0)
      }
    }

    const config = {
      files: values.files || [],
      directories: values.directories || [],
    }

    if (!config.files.length && !config.directories.length) {
      if (!fs.existsSync("registry")) {
        throw new Error(
          "No files or directories provided and no registry folder found",
        )
      }

      config.directories.push("@/registry")
    }

    const files = await getFiles()
    const aliases = await getAliases()

    const normalizedConfig = {
      files: normalizeAndFilter({
        paths: config.files,
        files,
        aliases,
      }),
      directories: normalizeAndFilter({
        paths: config.directories,
        files,
        aliases,
        directory: true,
      }),
    }

    const configFiles = [
      ...normalizedConfig.files,
      ...files.filter((file) =>
        normalizedConfig.directories.some((directory) =>
          file.startsWith(directory),
        ),
      ),
    ]

    const registryConfig =
      JSON.parse(await fs.promises.readFile("registry.json", "utf-8")) || {}
    const registryJson: {
      $schema?: string
      name?: string
      homepage?: string
      description?: string
      items?: {
        $schema?: string
        name?: string
        type?: string
        dependencies?: string[]
        files?: {
          type?: string
          target?: string
          content?: string
          path?: string
        }[]
      }[]
    } = {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: registryConfig.name || "acme",
      homepage: registryConfig.homepage || "https://acme.com",
      description: `${registryConfig.name || "acme"} registry schema w/o content`,
      items: [],
    }

    registryJson.items = []

    for (const file of configFiles) {
      if (file === "registry.json") continue

      let imports = normalizeImports({
        imports: await getImports({
          filePath: file,
          aliases,
          files,
        }),
        aliases,
      })

      const name = file
        .replace(/^registry\/[^\/]+\/blocks\//, "blocks/")
        .replace(/^registry\/default\/components\//, `components/`)
        .replace(/^registry\/([^\/]+)\/components\//, "components/$1/")
        .replace(/^registry\/[^\/]+\/ui\//, "components/ui/")
        .replace(/^registry\/[^\/]+\/hooks\//, "hooks/")
        .replace(/^registry\/[^\/]+\/lib\//, "lib/")
        .replace(/^blocks\//, "")
        .replace(/^components\/ui\//, "")
        .replace(/^components\//, "")
        .replace(/^hooks\//, "")
        .replace(/^lib\//, "")
        .replace(/\..*$/, "")
        .replace(/\//g, "-")

      const getType = (filePath: string) => {
        return (
          filePath
            .match(/^(block|components\/ui|components|hooks|lib)/)?.[0]
            .replace("components/ui", "registry:ui")
            .replace("components", "registry:component")
            .replace("hooks", "registry:hook")
            .replace("lib", "registry:lib")
            .replace("blocks", "registry:block") || "registry:file"
        )
      }

      let registryItem: boolean | { [key: string]: any } =
        files.includes("registry.json")
      let registryFiles: any = null

      if (registryConfig) {
        const items = registryConfig.items || []

        registryItem = items.find((item: any) => item.name === name) || {}

        if (typeof registryItem === "object" && registryItem.files) {
          registryFiles = await Promise.all(
            registryItem.files.map(async (file: { path: string }) => {
              return normalizeImports({
                imports: await getImports({
                  filePath: file.path,
                  aliases,
                  files,
                }),
                aliases,
              })
            }),
          )

          registryFiles = registryFiles.reduce((acc: any, curr: any) => {
            return {
              data: {
                files: [...acc.data.files, ...curr.data.files],
                dependencies: [
                  ...acc.data.dependencies,
                  ...curr.data.dependencies,
                ],
                orignal: [...acc.data.orignal, ...curr.data.orignal],
              },
              content: {
                ...acc.content,
                ...curr.content,
              },
            }
          })

          delete registryItem.dependencies
          delete registryItem.files
          delete registryItem.name
          delete registryItem.type
          delete registryItem.registryDependencies
        }
      }

      if (registryFiles) {
        imports.data = {
          files: Array.from(
            new Set([...imports.data.files, ...registryFiles.data.files]),
          ),
          dependencies: Array.from(
            new Set([
              ...imports.data.dependencies,
              ...registryFiles.data.dependencies,
            ]),
          ),
          orignal: Array.from(
            new Set([...imports.data.orignal, ...registryFiles.data.orignal]),
          ),
        }
        imports.content = {
          ...imports.content,
          ...registryFiles.content,
        }
      }

      const outputPath = path.join("public", "r", `${name}.json`)
      const outputData = {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name,
        type: getType(imports.data.files[0]),
        ...(imports.data.dependencies.length && {
          dependencies: imports.data.dependencies,
        }),
        files: imports.data.files.map((file) => {
          return {
            type: getType(file),
            target: file,
            content: imports.content[file],
            path: imports.data.orignal[imports.data.files.indexOf(file)],
          }
        }),
        ...(typeof registryItem === "object" && registryItem !== null
          ? registryItem
          : {}),
      }

      outputData.dependencies?.sort()

      outputData.files.sort((a, b) => {
        return a.target.localeCompare(b.target)
      })
      const typeOrder = {
        "registry:block": 1,
        "registry:file": 2,
        "registry:component": 3,
        "registry:ui": 4,
        "registry:hook": 5,
        "registry:lib": 6,
      }
      outputData.files.sort((a, b) => {
        return (
          typeOrder[a.type as keyof typeof typeOrder] -
          typeOrder[b.type as keyof typeof typeOrder]
        )
      })

      const prepareItem = {
        ...outputData,
        $schema: undefined,
        files: outputData.files.map(({ content, ...rest }) => rest),
      }

      registryJson.items.push(prepareItem)

      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(
        outputPath,
        JSON.stringify(outputData, null, 2) + "\n",
        "utf-8",
      )
    }

    registryJson.items = registryJson.items.sort((a, b) => {
      return (a.name || "").localeCompare(b.name || "")
    })

    const registryMapPath = path.join("public", "r", "registry.json")
    fs.writeFileSync(
      registryMapPath,
      JSON.stringify(registryJson, null, 2) + "\n",
      "utf-8",
    )

    process.exit(0)
  } catch (err: any) {
    console.error(helpMessage)
    console.error(`\n${err.message}\n`)
    process.exit(1)
  }
}

main()
