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

    // ~ Resolve all dependencies, files, and content for each file in the registry
    const resolveData = async (
      filePath: string,
      resolved = new Set<string>(),
    ) => {
      const data = {
        dependencies: [] as string[],
        files: [] as string[],
        content: {} as Record<string, string>,
      }

      if (resolved.has(filePath)) {
        return data
      } else {
        resolved.add(filePath)
      }

      data.files.push(filePath)

      data.content[filePath] =
        data.content[filePath] || (await fs.promises.readFile(filePath, "utf8"))

      const importStatements = data.content[filePath].match(
        /import\s+.*\s+from\s+['"](.*)['"]|import\s+['"](.*)['"]/g,
      )

      if (!importStatements) return data

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
          const pkg = importAddress.split("/").slice(0, 2).join("/")
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

      for (const file of data.files) {
        const newData = await resolveData(file, resolved)
        newData.dependencies.forEach((dep) => {
          if (!data.dependencies.includes(dep)) data.dependencies.push(dep)
        })
        newData.files.forEach((file) => {
          if (!data.files.includes(file)) data.files.push(file)
        })
        data.content[file] =
          newData.content[file] || (await fs.promises.readFile(file, "utf8"))
      }

      return data
    }

    // ~ Create config file
    const createConfig = (filepath: string) => {
      filepath = filepath.replace(aliases["@/"], "")
      if (filepath.startsWith("registry/")) {
        const transformedPath = filepath
          .replace(/^registry\//, "")
          .replace(/^([^\/]+)\/blocks\//, "blocks/$1/")
          .replace(/^([^\/]+)\/components\/ui\//, "$1/ui/")
          .replace(/^([^\/]+)\/components\//, "components/$1/")
          .replace(/^([^\/]+)\/hooks\//, "hooks/$1/")
          .replace(/^([^\/]+)\/lib\//, "lib/$1/")
          .replace(/^([^\/]+)\/ui\//, "components/ui/$1/")

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
            .replace(/\.[^/.]+$/, "")
            .replace(/^(blocks|components\/ui|components|hooks|lib)\//, ""),
          import: "@/" + transformedPath.replace(/\.[^/.]+$/, ""),
          target: transformedPath,
          path: filepath,
        }
      }
    }

    // ~ Build registry-item for each file in the registry
    for (const filePath of registryFiles) {
      const resolvedData = await resolveData(filePath)

      const cwd = process.cwd().split("/").pop()

      console.log(createConfig(filePath))

      const name = filePath
        .replace(aliases["@/"], "")
        .replace(/^registry\//, "")
        .replace(/^([^\/]+)\/blocks\//, "blocks/$1/")
        .replace(/^([^\/]+)\/ui\//, "components/ui/$1/")
        .replace(/^([^\/]+)\/components\//, "components/$1/")
        .replace(/^([^\/]+)\/hooks\//, "hooks/$1/")
        .replace(/^([^\/]+)\/lib\//, "lib/$1/")
        .replace(/\/default\//, `/${cwd}/`)
        .replace(/\.[^/.]+$/, "")

      console.log(
        `- ${name.padEnd(50, " ")} ${
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
        name,
        type:
          name
            .match(/^(blocks|components\/ui|components|hooks|lib)/)?.[1]
            .replace("blocks", "registry:block")
            .replace("components/ui", "registry:ui")
            .replace("components", "registry:component")
            .replace("hooks", "registry:hook")
            .replace("lib", "registry:lib") || "registry:file",
        ...(resolvedData.dependencies.length && {
          dependencies: resolvedData.dependencies,
        }),
        files: resolvedData.files.map((file) => {
          return {
            type:
              file
                .replace(aliases["@/"], "")
                .replace(/^registry\//, "")
                .replace(/^([^\/]+)\/blocks\//, "blocks/$1/")
                .replace(/^([^\/]+)\/ui\//, "components/ui/$1/")
                .replace(/^([^\/]+)\/components\//, "components/$1/")
                .replace(/^([^\/]+)\/hooks\//, "hooks/$1/")
                .replace(/^([^\/]+)\/lib\//, "lib/$1/")
                .replace(/\/default\//, `/${cwd}/`)
                .match(/^(blocks|components\/ui|components|hooks|lib)/)?.[1]
                .replace("blocks", "registry:block")
                .replace("components/ui", "registry:ui")
                .replace("components", "registry:component")
                .replace("hooks", "registry:hook")
                .replace("lib", "registry:lib") || "registry:file",
            target: file
              .replace(aliases["@/"], "")
              .replace(/^registry\//, "")
              .replace(/^([^\/]+)\/blocks\//, "blocks/$1/")
              .replace(/^([^\/]+)\/ui\//, "components/ui/$1/")
              .replace(/^([^\/]+)\/components\//, "components/$1/")
              .replace(/^([^\/]+)\/hooks\//, "hooks/$1/")
              .replace(/^([^\/]+)\/lib\//, "lib/$1/")
              .replace(/\/default\//, `/${cwd}/`),
            content: resolvedData.content[file],
            path: file,
          }
        }),
      }

      const registryItemPath = path.resolve(
        process.cwd(),
        "public/r",
        name.split("/").pop() + ".json",
      )
      await fs.promises.mkdir(path.dirname(registryItemPath), {
        recursive: true,
      })
      await fs.promises.writeFile(
        registryItemPath,
        JSON.stringify(registryItem, null, 2),
      )
    }

    process.exit(0)
  } catch (err: any) {
    console.error(helpMessage)
    console.error(`\n${err.message}\n`)
    process.exit(1)
  }
}

main()
