import fs, { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { getPackageManager } from "@/utils/get-package-manager"
import { execa } from "execa"
import { glob } from "tinyglobby"

export const codemodRadix = async ({ cwd }: { cwd: string }) => {
  const gitignorePath = path.resolve(cwd, ".gitignore")
  const ignore = existsSync(gitignorePath)
    ? (await readFile(gitignorePath, "utf8"))
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith("#"))
        .map((line) => line.replace(/^\//, "").replace(/^/, "**/"))
    : []

  const registryFiles = await glob(
    ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    {
      cwd,
      ignore,
    },
  )

  const unusedPackages = new Set<string>()

  const updateFiles = registryFiles.map(async (filepath) => {
    const absoluteFilepath = path.resolve(cwd, filepath)
    const fileContent = await fs.promises.readFile(absoluteFilepath, "utf-8")
    let transformedContent = fileContent
      .replace(
        /import \* as (\w+Primitive) from "@radix-ui\/react-([\w-]+)"/g,
        (_, primitive, pkg) => {
          unusedPackages.add(`@radix-ui/react-${pkg}`)
          return `import { ${primitive.replace(
            "Primitive",
            "",
          )} as ${primitive} } from "radix-ui"`
        },
      )
      // special case for `Sheet`
      .replace(/Sheet\s+as\s+SheetPrimitive/g, "Dialog as SheetPrimitive")

    // special cases for `Slot` including type, ternary and JSX
    if (
      /import\s+\{\s+Slot\s+\}\s+from\s+"@radix-ui\/react-slot"/.test(
        fileContent,
      )
    ) {
      transformedContent = transformedContent
        .replace(
          /import\s+\{\s+Slot\s+\}\s+from\s+"@radix-ui\/react-slot"/,
          () => {
            unusedPackages.add("@radix-ui/react-slot")
            return "import { Slot as SlotPrimitive } from 'radix-ui'"
          },
        )
        .replace(/typeof\s+Slot\b/g, "typeof SlotPrimitive.Slot")
        .replace(/\?\s+Slot\s+:/g, "? SlotPrimitive.Slot :")
        .replace(/<Slot\b/g, "<SlotPrimitive.Slot")
    }
    return fs.promises.writeFile(absoluteFilepath, transformedContent, "utf-8")
  })

  await Promise.all(updateFiles)

  // handle registry.json
  const registryJsonPath = path.resolve(cwd, "registry.json")
  if (existsSync(registryJsonPath)) {
    const registryContent = await fs.promises.readFile(
      registryJsonPath,
      "utf-8",
    )
    const parsedRegistry = JSON.parse(registryContent)

    interface RegistryObject {
      [key: string]: any
      dependencies?: string[]
      devDependencies?: string[]
    }

    const updateDependencies = (obj: RegistryObject): void => {
      for (const key in obj) {
        if (key === "dependencies" || key === "devDependencies") {
          obj[key] = Array.from(
            new Set(
              (obj[key] as string[]).map((item) => {
                if (unusedPackages.has(item)) return "radix-ui"
                return item
              }),
            ),
          )
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          updateDependencies(obj[key] as RegistryObject)
        }
      }
    }

    updateDependencies(parsedRegistry)

    const updatedRegistryContent = JSON.stringify(parsedRegistry, null, 2)
    await fs.promises.writeFile(
      registryJsonPath,
      updatedRegistryContent,
      "utf-8",
    )
  }

  const packageManager = await getPackageManager(cwd)

  if (unusedPackages.size) {
    await execa(
      packageManager,
      [
        packageManager === "npm" ? "uninstall" : "remove",
        ...Array.from(unusedPackages),
      ],
      {
        cwd,
      },
    )
  }

  await execa(
    packageManager,
    [packageManager === "npm" ? "install" : "add", "radix-ui"],
    {
      cwd,
    },
  )

  console.log(
    "\nCodemod ran successfully. Please run the command again without the --codemod-radix flag to generate the registry.",
  )
}
