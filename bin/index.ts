#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { parseArgs } from "node:util"
import { resolvePath } from "@/bin/utils"
import { getAliases } from "@/bin/utils/get-aliases"
import { getFiles } from "@/bin/utils/get-files"
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
    } as {
      files: string[]
      directories: string[]
    }

    const aliases = await getAliases()
    const files = await getFiles()

    // ~ If no files or directories are provided, use the registry or components directory
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

    // ~ Transform file path to registry-item
    const tranformer = (filepath: string) => {
      filepath = filepath.replace(aliases["@/"], "")
      const transformedPath = filepath.startsWith("registry/")
        ? filepath
            .replace(/^registry\//, "")
            .replace(/^([^\/]+)\/blocks\//, "blocks/$1/")
            .replace(/^([^\/]+)\/components\/ui\//, "$1/ui/")
            .replace(/^([^\/]+)\/components\//, "components/$1/")
            .replace(/^([^\/]+)\/hooks\//, "hooks/$1/")
            .replace(/^([^\/]+)\/lib\//, "lib/$1/")
            .replace(/^([^\/]+)\/ui\//, "components/ui/$1/")
            .replace(/\/default\//, "/")
        : filepath.replace(/\/default\//, "/")
      return {
        type:
          transformedPath
            .match(/^(blocks|components\/ui|components|hooks|lib)/)?.[1]
            .replace("blocks", "registry:block")
            .replace("components/ui", "registry:ui")
            .replace("components", "registry:component")
            .replace("hooks", "registry:hook")
            .replace("lib", "registry:lib") || "registry:file",
        name: transformedPath
          .replace(/^(blocks|components\/ui|components|hooks|lib)\//, "")
          .replace(/\.[^\/.]+$/, ""),
        import: "@/" + transformedPath.replace(/\.[^/.]+$/, ""),
        target: transformedPath,
        path: filepath,
      }
    }

    // ~ Resolve all dependencies, files, and content for each file in the registry
    const resolveData = async (
      filePaths: string[],
      resolved = new Set<string>(),
    ) => {
      const data = {
        dependencies: [] as string[],
        files: [] as string[],
        content: {} as Record<string, string>,
      }

      for (const filePath of filePaths) {
        if (resolved.has(filePath)) {
          continue
        } else {
          resolved.add(filePath)
        }

        data.files.push(filePath)

        data.content[filePath] =
          data.content[filePath] ||
          (await fs.promises.readFile(filePath, "utf8"))

        const importStatements = data.content[filePath].match(
          /import\s+[\s\S]+?from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"]|import\s+type\s+[\s\S]+?from\s+['"][^'"]+['"]/g,
        )

        if (!importStatements) continue

        const imports = importStatements.map(
          (statement) => statement.match(/['"](.*)['"]/)?.[1] as string,
        )

        for (const importAddress of imports) {
          const isAliased = Object.keys(aliases).some((alias) =>
            importAddress.startsWith(alias),
          )

          if (isAliased) {
            let realPath = resolvePath(importAddress, aliases)
            realPath =
              files.find((f) => f.startsWith(realPath + ".")) ||
              files.find((f) => f.startsWith(realPath + "/index")) ||
              realPath
            if (!data.files.includes(realPath)) data.files.push(realPath)
          } else if (importAddress.startsWith(".")) {
            let realPath = path.resolve(path.dirname(filePath), importAddress)
            realPath =
              files.find((f) => f.startsWith(realPath + ".")) ||
              files.find((f) => f.startsWith(realPath + "/index")) ||
              realPath
            if (!data.files.includes(realPath)) data.files.push(realPath)
          } else {
            const ignoredDeps = ["fs", "path", "util"]
            let pkg = importAddress.split("/").slice(0, 2).join("/")
            pkg = pkg.startsWith("@") ? pkg : pkg.split("/")[0]
            const isValidPackage = /^[a-zA-Z0-9@/-]+$/.test(pkg)
            if (
              isValidPackage &&
              !ignoredDeps.includes(pkg) &&
              !data.dependencies.includes(pkg)
            ) {
              data.dependencies.push(pkg)
            }
          }
        }
      }

      for (const file of data.files) {
        const newData = await resolveData([file], resolved)
        newData.dependencies.forEach((dep) => {
          if (!data.dependencies.includes(dep)) data.dependencies.push(dep)
        })
        newData.files.forEach((file) => {
          if (!data.files.includes(file)) data.files.push(file)
        })
        data.content[file] =
          newData.content[file] || (await fs.promises.readFile(file, "utf8"))
      }

      // ~ Replace import statements with transformed import paths
      for (const file of data.files) {
        data.content[file] = data.content[file].replace(
          /import\s+[\s\S]+?from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"]|import\s+type\s+[\s\S]+?from\s+['"][^'"]+['"]/g,
          (statement) => {
            const importAddress = statement.match(/['"](.*)['"]/)?.[1] as string
            const isAliased = Object.keys(aliases).some((alias) =>
              importAddress.startsWith(alias),
            )
            if (isAliased) {
              const realPath = resolvePath(importAddress, aliases)
              const transformedPath = tranformer(realPath)?.import
              return statement.replace(importAddress, transformedPath)
            } else if (importAddress.startsWith(".")) {
              const realPath = path.resolve(path.dirname(file), importAddress)
              const transformedPath = tranformer(realPath)?.import
              return statement.replace(importAddress, transformedPath)
            } else {
              return statement
            }
          },
        )
      }

      // ~ Sort dependencies and files
      data.dependencies.sort()
      data.files.sort((a, b) =>
        tranformer(a).target.localeCompare(tranformer(b).target),
      )
      data.files.sort((a, b) => {
        const typeOrder = [
          "registry:file",
          "registry:block",
          "registry:component",
          "registry:ui",
          "registry:hook",
          "registry:lib",
        ]
        const typeA = tranformer(a).type
        const typeB = tranformer(b).type
        return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB)
      })

      return data
    }

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

    // ~ Build registry-item for each file in the registry
    for (const filePath of registryFiles) {
      const resolvedData = await resolveData([
        filePath,
        // ~ If registry has keys items, find the item with the same name as the current file and if that item has files, add their file path to the resolved data
        ...(registry.items
          ?.find((item: any) => item.name === tranformer(filePath).name)
          ?.files?.map((file: { path?: string }) => file.path) || []),
      ])

      console.log(
        `- ${filePath.padEnd(50, " ")} ${
          resolvedData.dependencies.length
            ? "📦" + String(resolvedData.dependencies.length).padEnd(2, " ")
            : "   "
        }  ${
          resolvedData.files.length - 1
            ? "📄" + String(resolvedData.files.length - 1).padEnd(2, " ")
            : "   "
        }`,
      )

      const registryItem = {
        $schema: "https://ui.shadcn.com/schema/registry-item.json",
        name: tranformer(filePath).name,
        type: tranformer(filePath).type || "registry:file",
        // dependencies: resolvedData.dependencies,
        ...(resolvedData.dependencies.length && {
          dependencies: resolvedData.dependencies,
        }),
        files: resolvedData.files.map((file) => {
          return {
            type: tranformer(file).type || "registry:file",
            target: tranformer(file).target || file,
            content: resolvedData.content[file],
            path: file,
          } as Record<string, any>
        }),
        // ~ Add properties from the registry.json items, which don't exist in the resolved registry-item
        ...Object.fromEntries(
          Object.entries(
            registry.items?.find(
              (item: { name?: string }) =>
                item.name === tranformer(filePath).name,
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
      await fs.promises.mkdir(path.dirname(registryItemPath), {
        recursive: true,
      })
      await fs.promises.writeFile(
        registryItemPath,
        JSON.stringify(registryItem, null, 2) + "\n",
      )
      registryItem.files.forEach((file) => delete file.content)
      registryJson.items.push(registryItem)
    }

    // ~ Write registry.json file to public directory
    registryJson.items.sort((a, b) => a.name.localeCompare(b.name))

    await fs.promises.writeFile(
      path.resolve(process.cwd(), "public/registry.json"),
      JSON.stringify(registryJson, null, 2) + "\n",
    )

    process.exit(0)
  } catch (err: any) {
    console.error(helpMessage)
    console.error(`\n${err.message}\n`)
    process.exit(1)
  }
}

main()
