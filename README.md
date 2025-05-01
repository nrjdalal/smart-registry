# Smart Registry

[![Twitter](https://img.shields.io/twitter/follow/nrjdalal_com?label=%40nrjdalal_com)](https://twitter.com/nrjdalal_com)
[![npm](https://img.shields.io/npm/v/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![npm](https://img.shields.io/npm/dt/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![GitHub](https://img.shields.io/github/stars/nrjdalal/smart-registry?color=blue)](https://github.com/nrjdalal/smart-registry)

A `zero-configuration` (no registry.json required), [shadcn add](https://ui.shadcn.com/docs/cli#add) / [open in v0](https://ui.shadcn.com/docs/registry/open-in-v0) compatible registry builder. With amazing visual feedback like how many dependencies and files are being added to a file/component and much more.

> The best configuration is no configuration. Focus on developing building blocks, components, pages, etc rather than spending time configuring the registry.

![Demo Originui](https://github.com/user-attachments/assets/4f288629-5fc5-402c-a168-d4250d34ae92)

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

Or delete the `registry.json` file entirely. No changes will be made to the generated `public/r/dialog.json` file. Smart, right?

```bash
rm registry.json && npx smart-registry
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
      "content": "...",
      "path": "registry/default/ui/button.tsx"
    },
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "content": "...",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "content": "...",
      "path": "registry/default/lib/utils.ts"
    }
  ]
}
```

</details>

<br/>

Manual maintenance of `registry.json` files can lead to errors due to missing dependencies or files, or wrongful addition of unnecessary ones. `Smart Registry` reduces these risks by automating the detection and generation of the all-in-one `r/registry.json` and `r/<registry-item>.json` entries, making registry management more efficient.

## Table of Contents

- [Usage](#usage)
  - [Automatic Detection](#automatic-detection)
  - [Advanced Usage](#advanced-usage)
- [How it Works](#how-it-works)
- [Extending Properties](#extending-properties)
  - [With Zero-Configuration](#with-zero-configuration)
  - [Add Custom Properties](#add-custom-properties)
  - [Additional Files to Include](#additional-files-to-include)
  - [External Registry Dependencies](#external-registry-dependencies)
  - [Specify Dependency Version](#specify-dependency-version)
- [Directory Structure](#directory-structure)
  - [For `registry` Directory](#for-registry-directory)
  - [For `registry` Directory with Multiple Registries](#for-registry-directory-with-multiple-registries)
  - [For `components` Directory](#for-components-directory)
  - [For `components` Directory with Multiple Registries](#for-components-directory-with-multiple-registries)

## Usage

### Automatic Detection

If your project contains a `registry`, `components`, or `src/components` directory, `Smart Registry` will automatically detect and generate the necessary registry files. For more details, refer to the [directory structure](#directory-structure) section.

```bash
npx smart-registry
```

Yeah, that's it! You don't need to do anything else. `Smart Registry` has the word `smart` in it for a reason.

### Advanced Usage

If you want, you can customize the output directory, working directory, and provide files or directories to build the registry from.

```plaintext
Version:
  smart-registry@0.17.2

Usage:
  $ smart-registry [files/directories] ... [options]

Arguments:
  files/directories       files or directories to extend the registry (optional)

Options:
  -o, --output <path>     destination directory for json files (default: "./public/r")
  -c, --cwd <cwd>         the working directory (default: "./")
  -i, --ignore <pattern>  ignore files matching the pattern (default: none)
  -p, --patterns-only     generate registry items for patterns only (default: false)
  --codemod-radix         migrate to unify "@radix-ui/react-*" imports to "radix-ui"
  -v, --version           display version
  -h, --help              display help

Author:
  Neeraj Dalal <admin@nrjdalal.com> (https://nrjdalal.com)
```

e.g. to generate the registry in the `json` directory from some file and directory at the working directory (`apps/www`).

```bash
npx smart-registry path/to/file.ext path/to/directory ... --output json --cwd apps/www
```

- `cwd` is useful when working with monorepos or multiple projects.

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

1. `Smart Registry` will scan the `registry` directory and its sub-directories to find all the files (if no `registry` directory is found, it will scan the `components` or `src/components` directory).
2. For each file, it will generate a `<registry-item>.json` file by reading the file's content and extracting the imports for registry dependencies, dependencies, and files recursively.
3. It will then generate a `registry.json` file by combining all the `<registry-item>.json` files with all the properties required for `shadcn add` or `open in v0`.

```plaintext
public/
└── r/
    ├── button.json
    ├── dialog.json
    ├── registry.json
    └── utils.json
```

## Extending Properties

You can add/extend the generated `public/r/registry.json` and `public/r/<registry-item>.json` files by creating a `registry.json` file in the root of your project. The properties in this file will be merged with the generated properties.

We will consider the dialog component with the following directory structure to demonstrate the extension of properties.

```plaintext
registry/
└── default/
    ├── lib/
    │   └── utils.ts
    └── ui/
        └── dialog.tsx
```

### With Zero-Configuration

<details><summary>Generated public/r/dialog.json</summary><br/>

```diff
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "content": "...",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "content": "...",
      "path": "registry/default/lib/utils.ts"
    }
  ]
}
```

</details>

### Add Custom Properties

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

<details><summary>Generated public/r/dialog.json</summary><br/>

```diff
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "content": "...",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "content": "...",
      "path": "registry/default/lib/utils.ts"
    }
  ],
+  "meta": {
+    "tags": ["dialog", "modal"]
+  }
}
```

</details>

### Additional Files to Include

```diff
{
  "items": [
    {
      "name": "dialog",
      "type": "registry:ui",
+      "files": [
+        {
+          "type": "registry:ui",
+          "path": "registry/default/ui/button.tsx"
+        }
+      ]
    }
  ]
}
```

<details><summary>Generated public/r/dialog.json</summary><br/>

```diff
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
+    {
+      "type": "registry:ui",
+      "target": "components/ui/button.tsx",
+      "content": "...",
+      "path": "registry/default/ui/button.tsx"
+    },
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "content": "...",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "content": "...",
      "path": "registry/default/lib/utils.ts"
    }
  ]
}
```

</details>

### External Registry Dependencies

```diff
{
  "items": [
    {
      "name": "dialog",
      "type": "registry:ui",
+      "registryDependencies": ["button"]
    }
  ]
}
```

<details><summary>Generated public/r/dialog.json</summary><br/>

```diff
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
  "dependencies": ["@radix-ui/react-dialog"],
  "files": [
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "content": "...",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "content": "...",
      "path": "registry/default/lib/utils.ts"
    }
  ],
+  "registryDependencies": ["button"]
}
```

</details>

### Specify Dependency Version

Note: Only add the dependency that you want to specify the version for. The rest of the dependencies will be automatically added.

```diff
{
  "items": [
    {
      "name": "dialog",
      "type": "registry:ui",
+      "dependencies": ["@radix-ui/react-dialog@1.0.0"]
    }
  ]
}
```

<details><summary>Generated public/r/dialog.json</summary><br/>

```diff
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "dialog",
  "type": "registry:ui",
-  "dependencies": ["@radix-ui/react-dialog"],
+  "dependencies": ["@radix-ui/react-dialog@1.0.0"],
  "files": [
    {
      "type": "registry:ui",
      "target": "components/ui/dialog.tsx",
      "content": "...",
      "path": "registry/default/ui/dialog.tsx"
    },
    {
      "type": "registry:lib",
      "target": "lib/utils.ts",
      "content": "...",
      "path": "registry/default/lib/utils.ts"
    }
  ]
}
```

</details>

## Directory Structure

### For `registry` Directory

- Use direct name for default registry.

```plaintext
registry/
├── blocks/
│   └── toasty.tsx
├── components/
│   └── toaster.tsx
├── hooks/
│   └── use-toast.ts
├── lib/
│   └── utils.ts
└── ui/
    └── toast.tsx
```

- Or use `default` sub-directory for default registry.

```plaintext
registry/
└── default/
    ├── blocks/
    │   └── toasty.tsx
    ├── components/
    │   └── toaster.tsx
    ├── hooks/
    │   └── use-toast.ts
    ├── lib/
    │   └── utils.ts
    └── ui/
        └── toast.tsx
```

Both generate the following items in `public/r` directory.

```plaintext
public/
└── r/
    ├── toasty.json     name: toasty     target: blocks/toasty.tsx
    ├── component.json  name: toaster    target: components/toaster.tsx
    ├── use-toast.json  name: use-toast  target: hooks/use-toast.ts
    ├── utils.json      name: utils      target: lib/utils.ts
    └── toast.json      name: toast      target: components/ui/toast.tsx
```

### For `registry` Directory with Multiple Registries

- Use `<registry-name>` sub-directory for named registry.

```plaintext
registry/
├── default/
└── new-york/
    ├── blocks/
    │   └── toasty.tsx
    ├── components/
    │   └── toaster.tsx
    ├── hooks/
    │   └── use-toast.ts
    ├── lib/
    │   └── utils.ts
    └── ui/
        └── toast.tsx
```

Generates the following items in `public/r` directory.

```plaintext
public/
└── r/
    ├── registry.json
    └── new-york/
        ├── toasty.json     name: new-york-toasty     target: blocks/new-york/toasty.tsx
        ├── toaster.json    name: new-york-toaster    target: components/new-york/toaster.tsx
        ├── use-toast.json  name: new-york-use-toast  target: hooks/new-york/use-toast.ts
        ├── utils.json      name: new-york-utils      target: lib/new-york/utils.ts
        └── toast.json      name: new-york-toast      target: components/ui/new-york/toast.tsx
```

### For `components` Directory

- Use direct name for default registry.

```plaintext
blocks/
└── toasty.tsx
components/
├── ui/
│   └── dialog.tsx
└── toaster.tsx
hooks/
└── use-toast.ts
lib/
└── utils.ts
```

Generates the following items in `public/r` directory.

```plaintext
public/
└── r/
    ├── registry.json
    ├── toasty.json     name: toasty     target: blocks/toasty.tsx
    ├── component.json  name: toaster    target: components/toaster.tsx
    ├── use-toast.json  name: use-toast  target: hooks/use-toast.ts
    ├── utils.json      name: utils      target: lib/utils.ts
    └── toast.json      name: toast      target: components/ui/toast.tsx
```

### For `components` Directory with Multiple Registries

- Use `<registry-name>` sub-directory for named registry.

```plaintext
blocks/
└── new-york/
    └── toasty.tsx
components/
├── new-york/
│   └── toaster.tsx
└── ui/
    └── new-york/
        └── toast.tsx
hooks/
└── new-york/
    └── use-toast.ts
lib/
└── new-york/
    └── utils.ts
```

Generates the following items in `public/r` directory.

```plaintext
public/
└── r/
    ├── registry.json
    └── new-york/
        ├── toasty.json     name: new-york-toasty     target: blocks/new-york/toasty.tsx
        ├── toaster.json    name: new-york-toaster    target: components/new-york/toaster.tsx
        ├── use-toast.json  name: new-york-use-toast  target: hooks/new-york/use-toast.ts
        ├── utils.json      name: new-york-utils      target: lib/new-york/utils.ts
        └── toast.json      name: new-york-toast      target: components/ui/new-york/toast.tsx
```
