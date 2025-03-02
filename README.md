# Smart Registry

[![Twitter](https://img.shields.io/twitter/follow/nrjdalal_com?label=%40nrjdalal_com)](https://twitter.com/nrjdalal_com)
[![npm](https://img.shields.io/npm/v/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![npm](https://img.shields.io/npm/dt/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![GitHub](https://img.shields.io/github/stars/nrjdalal/smart-registry?color=blue)](https://github.com/nrjdalal/smart-registry)

A zero-configuration, [open in v0](https://ui.shadcn.com/docs/registry/open-in-v0) / [shadcn add](https://ui.shadcn.com/docs/cli#add) compatible registry builder.

> The best configuration is no configuration. In a UI/UX project, the focus should be on developing building blocks, components, and pages, rather than spending time configuring the registry.

## What is Zero-Configuration?

You can remove properties such as `registry dependencies`, `dependencies`, and `files` from your items in `registry.json`, or delete the entire `registry.json` file if not required.

Manual maintenance of `registry.json` files can lead to errors due to missing dependencies or files. `Smart Registry` mitigates these risks by automating the detection and generation of the required `registry.json` and `r/<registry-item>.json` entries without these properties, making it easier to manage your registry.

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
