#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { resolvePath } from "@/bin/utils"
import { getAliases } from "@/bin/utils/get-aliases"
import { getFiles } from "@/bin/utils/get-files"
import { resolver } from "@/bin/utils/resolver"
import { transformer } from "@/bin/utils/transformer"
import { author, name, version } from "@/package.json"

const helpMessage = `Version:
  ${name}@${version}

Usage:
  $ ${name} [options]

Options:
  -f, --files        Files to build the registry from
  -d, --directories  Directories to build the registry from
  -v, --version      Display version
  -h, --help         Display help

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
    // ~ Parse command line arguments
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

    // ~ Initialize configuration object
    const config = {
      files: values.files || [],
      directories: values.directories || [],
    } as {
      files: string[]
      directories: string[]
    }

    // ~ Get aliases and files from utility functions
    const aliases = await getAliases()
    const files = await getFiles()

    // ~ If no files or directories are provided, use registry or components directory
    if (!config.files.length && !config.directories.length) {
      const foundPath = ["registry", "components"]
        .map((dir) => aliases["@/"] + dir)
        .find((path) => files.some((file) => file.startsWith(path + "/")))
      if (foundPath) config.directories.push(foundPath)
      else throw new Error("Neither registry nor components directory found")
    }

    // ~ Get all files to build the registry from the provided files and directories
    const registryFiles = [
      ...config.files.map((file) => resolvePath(file, aliases)),
      ...config.directories.flatMap((dir) =>
        files.filter((file) =>
          file.startsWith(resolvePath(dir, aliases) + "/"),
        ),
      ),
    ]

    // ~ Read registry.json file if it exists
    const registryPath = path.resolve(process.cwd(), "registry.json")

    let registry: Record<string, any> = {}

    if (fs.existsSync(registryPath)) {
      registry = JSON.parse(await fs.promises.readFile(registryPath, "utf8"))
    }

    let registryJson = {
      ...registry,
      items: [] as Record<string, any>[],
    }

    const failed = [] as string[]

    // ~ Build registry-item for each file in the registry
    for (const filePath of registryFiles) {
      try {
        const resolvedData = await resolver(
          [
            filePath,
            ...(registry.items
              ?.find(
                (item: any) =>
                  item.name ===
                  transformer(filePath, {
                    aliases,
                  }).name,
              )
              ?.files?.map((file: { path?: string }) => file.path) || []),
          ],
          { aliases },
        )

        const registryItem = {
          $schema: "https://ui.shadcn.com/schema/registry-item.json",
          name: transformer(filePath, {
            aliases,
          }).name,
          type:
            transformer(filePath, {
              aliases,
            }).type || "registry:file",
          ...(resolvedData.dependencies.length && {
            dependencies: resolvedData.dependencies,
          }),
          files: resolvedData.files.map((file) => {
            return {
              type:
                transformer(file, {
                  aliases,
                }).type || "registry:file",
              target:
                transformer(file, {
                  aliases,
                }).target || file,
              content: resolvedData.content[file],
              path: file,
            } as Record<string, any>
          }),
          // ~ Add properties from the registry.json items, which don't exist in the resolved registry-item
          ...Object.fromEntries(
            Object.entries(
              registry.items?.find(
                (item: { name?: string }) =>
                  item.name ===
                  transformer(filePath, {
                    aliases,
                  }).name,
              ) || {},
            ).filter(
              ([key]) => !["$schema", "name", "type", "files"].includes(key),
            ),
          ),
        }

        const registryItemPath = path.resolve(
          process.cwd(),
          "public/r",
          registryItem.name + ".json",
        )

        // ~ Log the status of each registry item being processed
        console.log(
          `- ${filePath.padEnd(
            Math.max(...registryFiles.map((file) => file.length)) + 2,
            " ",
          )} ${
            resolvedData.dependencies.length
              ? "📦" + String(resolvedData.dependencies.length).padEnd(2, " ")
              : "    "
          }  ${
            resolvedData.files.length - 1
              ? "📄" + String(resolvedData.files.length).padEnd(2, " ")
              : "    "
          }   ${registryItemPath.replace(process.cwd() + "/", "")}`,
        )

        // ~ Create necessary directories and write registry item files
        await fs.promises.mkdir(path.dirname(registryItemPath), {
          recursive: true,
        })
        await fs.promises.writeFile(
          registryItemPath,
          JSON.stringify(registryItem, null, 2) + "\n",
        )
        registryItem.files.forEach((file) => delete file.content)
        registryJson.items.push(registryItem)
      } catch (err: any) {
        failed.push(filePath + ":  " + err.message)
        continue
      }
    }

    // ~ Write the final registry.json file to the public directory
    registryJson.items.sort((a, b) => a.name.localeCompare(b.name))

    await fs.promises.writeFile(
      path.resolve(process.cwd(), "public/registry.json"),
      JSON.stringify(registryJson, null, 2) + "\n",
    )

    // ~ Log failed files
    if (failed.length) {
      console.log()
      failed.forEach((file) => console.error(`\x1b[31m- ${file}\x1b[0m`))
    }

    process.exit(0)
  } catch (err: any) {
    console.error(helpMessage)
    console.error(`\n${err.message}\n`)
    process.exit(1)
  }
}

main()
