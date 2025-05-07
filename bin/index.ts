#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { codemodRadix } from "@/codemods/radix"
import { registryOrder } from "@/constants/orders"
import { getAliases } from "@/utils/aliases"
import { getInputRegistry, listRegistryFiles } from "@/utils/files"
import { dataResolver } from "@/utils/resolvers"
import { transformer } from "@/utils/transformer"
import { green } from "yoctocolors"
import { author, name, version } from "../package.json"

const helpMessage = `Version:
  ${name}@${version}

Usage:
  $ ${name} [files/directories] ... [options]

Arguments:
  files/directories       files or directories to extend the registry (optional)

Options:
  -o, --output <path>     destination directory for json files (default: "./public/r")
  -c, --cwd <cwd>         the working directory (default: "./")
  -i, --ignore <pattern>  ignore files matching the pattern (default: none)
  -u, --with-utils        include @/lib/utils in the registry items if exists (default: false)
  -v, --version           display version
  -h, --help              display help

With disabled automatic detection:
  -p, --patterns-only     generate registry items for only given files/directories (default: false)
  -r, --registry-only     generate registry items for only given registry.json (default: false)

Codemods:
  --codemod-radix         migrate to unify "@radix-ui/react-*" imports to "radix-ui"

Cleanup:
  --remove-prefix         remove given prefix from the registry item names (default: none)

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
        output: { type: "string", short: "o", default: "public/r" },
        cwd: { type: "string", short: "c" },
        ignore: { type: "string", short: "i", default: "" },
        "with-utils": {
          type: "boolean",
          short: "u",
          default: false,
        },
        "patterns-only": {
          type: "boolean",
          short: "p",
          default: false,
        },
        "registry-only": {
          type: "boolean",
          short: "r",
          default: false,
        },
        "codemod-radix": { type: "boolean" },
        "remove-prefix": { type: "string", default: "" },
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

    if (values["codemod-radix"]) {
      await codemodRadix({
        cwd,
      })
      process.exit(0)
    }

    const aliases = await getAliases(cwd)
    const registryFiles = values["registry-only"]
      ? []
      : await listRegistryFiles({
          cwd,
          patterns: positionals,
          ignore: values.ignore,
          patternsOnly: values["patterns-only"],
        })
    const inputRegistry = await getInputRegistry({
      cwd,
      aliases,
      registryFiles,
    })

    const failed = [] as string[]

    const inputRegistryItems =
      inputRegistry.items?.map((item: { name?: string }) => item.name) || []

    const outputRegistry = {
      ...inputRegistry,
      items: [] as Record<string, any>[],
    }

    // ~ Build registry-item for each file in the registry
    for (const filepath of [...registryFiles, ...inputRegistryItems]) {
      try {
        // ~ Skip if the filename is already in the output registry items
        if (
          outputRegistry.items?.find(
            (item) =>
              item.name === filepath ||
              item.name ===
                transformer({
                  cwd,
                  aliases,
                  filepath,
                }).name,
          )
        ) {
          continue
        }

        const existingConfig =
          inputRegistry.items?.find(
            (item: { name?: string }) =>
              item.name === filepath ||
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
            ...(inputRegistryItems.includes(filepath) ? [] : [filepath]),
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
          ]
            .filter(
              (dep, _, arr) =>
                !arr.some(
                  (otherDep) =>
                    otherDep !== dep && otherDep.startsWith(dep + "@"),
                ),
            )
            .sort(),
          devDependencies: [
            ...new Set([
              ...resolvedData.devDependencies,
              ...(existingConfig?.devDependencies || []),
            ]),
          ]
            .filter(
              (dep, _, arr) =>
                !arr.some(
                  (otherDep) =>
                    otherDep !== dep && otherDep.startsWith(dep + "@"),
                ),
            )
            .sort(),
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
          }).name.replace(
            new RegExp(`^${values["remove-prefix"] || ""}-?`),
            "",
          ),
          type:
            existingConfig.type ||
            transformer({
              cwd,
              aliases,
              filepath,
            }).type ||
            "registry:file",
          ...(extend.dependencies.length && {
            dependencies: extend.dependencies,
          }),
          ...(extend.devDependencies.length && {
            devDependencies: extend.devDependencies,
          }),
          ...(extend.registryDependencies.length && {
            registryDependencies: extend.registryDependencies,
          }),
          files: resolvedData.files.map((file) => {
            return {
              type: file.endsWith(".css")
                ? "registry:theme" // ~ WAIT: this is temp as maybe registry:style will be added to schema later
                : transformer({
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

        if (registryItem.files.length) {
          if (registryItem.files.length > 1 && !values["with-utils"]) {
            registryItem.files = registryItem.files.filter(
              (file: { target: string }) => file.target !== "lib/utils.ts",
            )
            registryItem.dependencies = registryItem.dependencies.filter(
              (dep: string) => !["clsx", "tailwind-merge"].includes(dep),
            )
          }

          if (
            registryItem.files.some(
              (file: { path: string }) => file.path === filepath,
            )
          ) {
            registryItem.files = registryItem.files.sort(
              (
                a: { path: string; type: string },
                b: { path: string; type: string },
              ) => {
                if (a.path === filepath) return -1
                if (b.path === filepath) return 1
                const order = registryOrder.items.files.type.default
                return order.indexOf(a.type) - order.indexOf(b.type)
              },
            )
          } else {
            registryItem.files = [
              registryItem.files[0],
              ...registryItem.files
                .slice(1)
                .sort(
                  (
                    a: { path: string; type: string },
                    b: { path: string; type: string },
                  ) => {
                    const order = registryOrder.items.files.type.default
                    return order.indexOf(a.type) - order.indexOf(b.type)
                  },
                ),
            ]
          }
        }

        // ~ Remove language-specific dependencies
        if (registryItem.dependencies) {
          registryItem.dependencies = registryItem.dependencies.filter(
            (dep: string) => dep !== "react",
          )
        }

        // ~ Remove empty properties from the registry item
        for (const key in registryItem) {
          if (
            (Array.isArray(registryItem[key]) &&
              registryItem[key].length === 0) ||
            (typeof registryItem[key] === "object" &&
              registryItem[key] !== null &&
              Object.keys(registryItem[key]).length === 0)
          ) {
            delete registryItem[key]
          }
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
          `${
            filepath === "ui" || filepath === "style"
              ? `- 🔥 'registry:${filepath}' pack`.padEnd(
                  Math.max(
                    ...registryFiles.map(
                      (file) =>
                        path.relative(process.cwd(), path.resolve(cwd, file))
                          .length,
                    ),
                  ) + 4,
                  " ",
                )
              : "- " +
                path
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
                  )
          } ${
            resolvedData.dependencies?.length
              ? "📦" + String(resolvedData.dependencies.length).padEnd(2, " ")
              : "    "
          }  ${
            registryItem.files?.length - 1
              ? "📄" + String(registryItem.files.length).padEnd(2, " ")
              : "    "
          }   ${path.relative(process.cwd(), registryItemPath)}`,
        )

        // ~ Create necessary directories and write registry item files
        await fs.promises.mkdir(path.dirname(registryItemPath), {
          recursive: true,
        })
        await fs.promises.writeFile(
          registryItemPath,
          JSON.stringify(registryItem, null, 2) + "\n",
        )
        registryItem.files?.forEach((file: { content: any }) => {
          delete file.content
        })
        delete registryItem.$schema
        outputRegistry.items.push(registryItem)
      } catch (err: any) {
        failed.push(filepath + ": " + err.message)
        continue
      }
    }

    // ~ Write the final registry.json file to the public directory
    outputRegistry.items
      .sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      })
      .sort((a, b) => {
        const typeOrder = registryOrder.items.type.default
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type)
      })

    await fs.promises.writeFile(
      path.resolve(cwd, values.output, "registry.json"),
      JSON.stringify(outputRegistry, null, 2) + "\n",
    )

    // console table for the registry.json file
    const itemsByType = outputRegistry.items.reduce(
      (acc: Record<string, number>, item: Record<string, any>) => {
        acc[item.type] = (acc[item.type] || 0) + 1
        return acc
      },
      {},
    )
    console.log()
    console.table(
      Object.entries(itemsByType).map(([type, items]) => ({
        Type: type,
        Items: items,
      })),
    )
    console.log(
      `\n- Master (shadcn-compatible) "registry.json" file created at: ${green(path.relative(process.cwd(), path.resolve(cwd, values.output, "registry.json")))} with ${
        outputRegistry.items.length
      } items`,
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
