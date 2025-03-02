# Smart Registry

[![Twitter](https://img.shields.io/twitter/follow/nrjdalal_com?label=%40nrjdalal_com)](https://twitter.com/nrjdalal_com)
[![npm](https://img.shields.io/npm/v/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![npm](https://img.shields.io/npm/dt/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![GitHub](https://img.shields.io/github/stars/nrjdalal/smart-registry?color=blue)](https://github.com/nrjdalal/smart-registry)

A zero-configuration, [open in v0](https://ui.shadcn.com/docs/registry/open-in-v0) / [shadcn add](https://ui.shadcn.com/docs/cli#add) compatible registry builder.

> The best configuration is no configuration. In a UI/UX project, the focus should be on developing building blocks, components, and pages, rather than spending time configuring the registry.

## What is Zero-Configuration?

You can simplify your `registry.json` by removing properties like `registry dependencies`, `dependencies`, and `files`. If you don't need to add custom properties or extend default ones, you can even delete the `registry.json` file entirely.

```diff
{
  "items": [
    {
      "name": "dialog",
      "type": "registry:ui",
-      "registryDependencies": [
-        "button"
-      ],
-      "dependencies": [
-        "@radix-ui/react-dialog"
-      ],
-      "files": [
-        {
-          "path": "registry/default/ui/dialog.tsx",
-          "type": "registry:ui"
-        }
-      ]
-    }
  ]
}
```

<details><summary>Click here to see the generated dialog.json</summary><br/>

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
    {
      "type": "registry:ui",
      "target": "components/ui/button.tsx",
      "path": "registry/default/ui/button.tsx"
    },
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "path": "registry/default/lib/utils.ts"
    }
  ]
}
```

</details>

Manual maintenance of `registry.json` files can lead to errors due to missing dependencies or files, or wrongful addition of unnecessary ones. `Smart Registry` reduces these risks by automating the detection and generation of the necessary `registry.json` and `r/<registry-item>.json` entries, making registry management more efficient.

## Usage

### Automatic Detection

To use `Smart Registry` automatic detection, you need:

1. A `tsconfig.json` file with atleast alias `@/*` with path.
2. A `registry`, `components`, or `src/components` directory.

| Alias | Path      | Directory (Required)       |
| ----- | --------- | -------------------------- |
| `@/*` | `./src/*` | `src/components`           |
| `@/*` | `./*`     | `components` or `registry` |

Then, run the following command:

```bash
npx smart-registry
```

### From Specific Files

Sometimes, you may want to generate the registry from specific pages or components. In such cases, you can use the `-f` flag to specify the files.

```bash
npx smart-registry -f <file1> -f <file2> -f <file3> ...
```

### From Specific Directories

If you want to generate the registry from specific directories, you can use the `-d` flag to specify the directories.

```bash
npx smart-registry -d <directory1> -d <directory2> -d <directory3> ...
```

## How it Works

Let's take an following directory structure to understand how `Smart Registry` works.

```plaintext
registry/
  default/
    ui/
      button.tsx
      dialog.tsx
    lib/
      utils.ts
```

1. `Smart Registry` will scan the `registry` directory for files.
2. For each file, it will generate a `<registry-item>.json` file by reading the file's content and extracting the imports for registry dependencies, dependencies, and files recursively.
3. It will then generate a `registry.json` file by combining all the `<registry-item>.json` files with all the properties required for `shadcn add` or `open in v0`.

## Extending Properties

You can extend the generated `registry.json` and `r/<registry-item>.json` files by creating a `registry.json` file in the root of your project. The properties in this file will be merged with the generated properties.

### 1. Let's start with running `npx smart-registry` to generate the registry.

<details><summary>Click here to see the generated registry.json</summary><br/>

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "items": [
    {
      "name": "dialog",
      "type": "registry:ui",
      "dependencies": ["@radix-ui/react-dialog"],
      "files": [
        {
          "type": "registry:ui",
          "target": "components/ui/button.tsx",
          "path": "registry/default/ui/button.tsx"
        },
        {
          "type": "registry:ui",
          "target": "components/ui/dialog.tsx",
          "path": "registry/default/ui/dialog.tsx"
        },
        {
          "type": "registry:lib",
          "target": "lib/utils.ts",
          "path": "registry/default/lib/utils.ts"
        }
      ]
    }
  ]
}
```

</details>

### 2. Adding `meta` property to `registry-item`:

```diff
{
  "items": [
    {
      "name": "dialog",
      "type": "registry:ui",
+      "meta": {
+        "tags": ["dialog", "modal"]
+      }
    }
  ]
}
```

<details><summary>Click here to see the generated dialog.json</summary><br/>

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
    {
      "type": "registry:ui",
      "target": "components/ui/button.tsx",
      "path": "registry/default/ui/button.tsx"
    },
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "path": "registry/default/lib/utils.ts"
    }
  ],
+  "meta": {
+    "tags": ["dialog", "modal"]
+  }
}
```

</details>
