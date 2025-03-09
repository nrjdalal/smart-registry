#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { registryOrder } from "@/constants/orders"
import { getAliases } from "@/utils/aliases"
import { getInputRegistry, listRegistryFiles } from "@/utils/files"
import { dataResolver } from "@/utils/resolvers"
import { transformer } from "@/utils/transformer"
import { author, name, version } from "../package.json"

const helpMessage = `Version:
  ${name}@${version}

Usage:
  $ ${name} [options] [files/directories] ...

Arguments:
  files/directories    files or directories to build the registry from (optional)

Options:
  -o, --output <path>  destination directory for json files (default: "./public/r")
  -c, --cwd <cwd>      the working directory (default: "./")
  -v, --version        display version
  -h, --help           display help

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
        cwd: { type: "string", short: "c" },
        ignore: { type: "string", short: "i", default: "" },
        output: { type: "string", short: "o", default: "public/r" },
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

    const cwd = path.resolve(values.cwd ?? process.cwd())

    const aliases = await getAliases(cwd)
    const inputRegistry = await getInputRegistry(cwd)
    const registryFiles = await listRegistryFiles({
      cwd,
      patterns: positionals,
      ignore: values.ignore,
    })

    const failed = [] as string[]

    const outputRegistry = {
      ...inputRegistry,
      items: [] as Record<string, any>[],
    }

    // ~ Build registry-item for each file in the registry
    for (const filepath of registryFiles) {
      try {
        const existingConfig =
          inputRegistry.items?.find(
            (item: { name?: string }) =>
              item.name ===
              transformer({
                cwd,
                aliases,
                filepath,
              }).name,
          ) || {}

        const resolvedData = await dataResolver({
          cwd,
          aliases,
          filepaths: [
            filepath,
            ...(existingConfig?.files?.map(
              (file: { path: string }) => file.path,
            ) || []),
          ],
        })

        const extend = {
          dependencies: [
            ...new Set([
              ...resolvedData.dependencies,
              ...(existingConfig?.dependencies || []),
            ]),
          ].sort(),
          devDependencies: [
            ...new Set([...(existingConfig?.devDependencies || [])]),
          ].sort(),
          registryDependencies: [
            ...new Set([...(existingConfig?.registryDependencies || [])]),
          ].sort(),
        }

        let registryItem: Record<string, any> = {
          $schema: "https://ui.shadcn.com/schema/registry-item.json",
          name: transformer({
            cwd,
            aliases,
            filepath,
          }).name,
          type:
            transformer({
              cwd,
              aliases,
              filepath,
            }).type || "registry:file",
          ...(extend.dependencies.length && {
            dependencies: extend.dependencies,
          }),
          ...(extend.devDependencies.length && {
            devDependencies: extend.devDependencies,
          }),
          ...(extend.registryDependencies.length && {
            registryDependencies: extend.registryDependencies,
          }),
          files: resolvedData.files
            .map((file) => {
              return {
                type:
                  transformer({
                    cwd,
                    aliases,
                    filepath: file,
                  }).type || "registry:file",
                target:
                  transformer({
                    cwd,
                    aliases,
                    filepath: file,
                  }).target || file,
                content: resolvedData.content[file],
                path: file,
              } as Record<string, any>
            })
            .sort((a, b) => {
              const order = registryOrder.items.files.type.default
              return order.indexOf(b.type) - order.indexOf(a.type)
            }),
          // ~ Add properties from the registry.json items, which don't exist in the resolved registry-item
          ...Object.fromEntries(
            Object.entries(existingConfig).filter(
              ([key]) =>
                ![
                  "$schema",
                  "name",
                  "type",
                  "dependencies",
                  "devDependencies",
                  "registryDependencies",
                  "files",
                ].includes(key),
            ),
          ),
        }

        registryItem = Object.keys(registryItem)
          .sort((a, b) => {
            const order = registryOrder.items.default
            return order.indexOf(a) - order.indexOf(b)
          })
          .reduce(
            (obj, key) => {
              obj[key] = registryItem[key]
              return obj
            },
            {} as Record<string, any>,
          )

        const registryItemPath = path.resolve(
          cwd,
          values.output,
          registryItem.name + ".json",
        )

        // ~ Log the status of each registry item being processed
        console.log(
          `- ${path
            .relative(process.cwd(), path.resolve(cwd, filepath))
            .padEnd(
              Math.max(
                ...registryFiles.map(
                  (file) =>
                    path.relative(process.cwd(), path.resolve(cwd, file))
                      .length,
                ),
              ) + 2,
              " ",
            )} ${
            resolvedData.dependencies.length
              ? "📦" + String(resolvedData.dependencies.length).padEnd(2, " ")
              : "    "
          }  ${
            resolvedData.files.length - 1
              ? "📄" + String(resolvedData.files.length).padEnd(2, " ")
              : "    "
          }   ${path.relative(process.cwd(), registryItemPath)}`,
        )

        // ${path.relative(cwd, registryItemPath)}

        // ~ Create necessary directories and write registry item files
        await fs.promises.mkdir(path.dirname(registryItemPath), {
          recursive: true,
        })
        await fs.promises.writeFile(
          registryItemPath,
          JSON.stringify(registryItem, null, 2) + "\n",
        )
        registryItem.files.forEach(
          (file: { content: any }) => delete file.content,
        )
        outputRegistry.items.push(registryItem)
      } catch (err: any) {
        failed.push(filepath + ": " + err.message)
        continue
      }
    }

    // ~ Write the final registry.json file to the public directory
    outputRegistry.items
      .sort((a, b) => {
        return a.name.localeCompare(b.name)
      })
      .sort((a, b) => {
        const typeOrder = registryOrder.items.type.default
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
      })

    await fs.promises.writeFile(
      path.resolve(cwd, values.output, "registry.json"),
      JSON.stringify(outputRegistry, null, 2) + "\n",
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
