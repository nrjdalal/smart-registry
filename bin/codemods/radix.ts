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

  for (const filepath of registryFiles) {
    const absoluteFilepath = path.resolve(filepath)
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
      .replace(/Sheet as SheetPrimitive/g, "Dialog as SheetPrimitive")

    // Check if Slot import already exists
    if (
      /import\s+\{\s+Slot\s+\}\s+from\s+"@radix-ui\/react-slot"/.test(
        fileContent,
      )
    ) {
      transformedContent = transformedContent
        // special cases for `Slot` including type, ternary and JSX
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
    await fs.promises.writeFile(absoluteFilepath, transformedContent, "utf-8")
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
