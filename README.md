# Smart Registry

[![Twitter](https://img.shields.io/twitter/follow/nrjdalal_com?label=%40nrjdalal_com)](https://twitter.com/nrjdalal_com)
[![npm](https://img.shields.io/npm/v/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![npm](https://img.shields.io/npm/dt/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![GitHub](https://img.shields.io/github/stars/nrjdalal/smart-registry?color=blue)](https://github.com/nrjdalal/smart-registry)

A zero-configuration, [open in v0](https://ui.shadcn.com/docs/registry/open-in-v0) / [shadcn add](https://ui.shadcn.com/docs/cli#add) compatible registry builder.

> The best configuration is no configuration. In a UI/UX project, the focus should be on developing building blocks, components, and pages, rather than spending time configuring the registry.

## What is Zero-Configuration?

Simplify your `registry.json` by removing properties like `registryDependencies`, `dependencies`, and `files`. If you don't need to add custom properties or extend default ones, you can even delete the `registry.json` file entirely.

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

<details><summary>Generated public/r/dialog.json</summary><br/>

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

1. A `tsconfig.json` file with at least alias `@/*` with path.
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

If you want to generate the registry from specific files, you can use the `-f` flag to specify the files.

```bash
npx smart-registry -f <file1> -f <file2> -f <file3> ...
```

### From Specific Directories

To generate the registry from specific directories, use the `-d` flag to specify the directories.

```bash
npx smart-registry -d <directory1> -d <directory2> -d <directory3> ...
```

## How it Works

Let's take the following directory structure to understand how `Smart Registry` works.

```plaintext
registry/
└── default/
    ├── lib/
    │   └── utils.ts
    └── ui/
        ├── button.tsx
        └── dialog.tsx

```

1. `Smart Registry` will scan the `registry` directory for files.
2. For each file, it will generate a `<registry-item>.json` file by reading the file's content and extracting the imports for registry dependencies, dependencies, and files recursively.
3. It will then generate a `registry.json` file by combining all the `<registry-item>.json` files with all the properties required for `shadcn add` or `open in v0`.

```plaintext
public/
├── r/
│   ├── button.json
│   ├── dialog.json
│   └── utils.json
└── registry.json
```

## Extending Properties

You can extend the generated `registry.json` and `r/<registry-item>.json` files by creating a `registry.json` file in the root of your project. The properties in this file will be merged with the generated properties.

### Let's take an example, for the following directory structure:

```plaintext
registry/
└── default/
    ├── lib/
    │   └── utils.ts
    └── ui/
        └── dialog.tsx

```

1. Run `npx smart-registry` to generate the registry without having a `registry.json` file.

<details><summary>Generated public/r/dialog.json</summary><br/>

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
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

2. Add meta tags to the dialog item in the `registry.json` file.

```diff
+{
+  "items": [
+    {
+      "name": "dialog",
+      "type": "registry:ui",
+      "meta": {
+        "tags": ["dialog", "modal"]
+      }
+    }
+  ]
+}
```

<details><summary>Generated public/r/dialog.json</summary><br/>

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
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
  "meta": {
    "tags": ["dialog", "modal"]
  }
}
```

</details>
