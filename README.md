# Smart Registry

[![Twitter](https://img.shields.io/twitter/follow/nrjdalal_com?label=%40nrjdalal_com)](https://twitter.com/nrjdalal_com)
[![npm](https://img.shields.io/npm/v/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![npm](https://img.shields.io/npm/dt/smart-registry?color=red&logo=npm)](https://www.npmjs.com/package/smart-registry)
[![GitHub](https://img.shields.io/github/stars/nrjdalal/smart-registry?color=blue)](https://github.com/nrjdalal/smart-registry)

A zero-configuration, [open in v0](https://ui.shadcn.com/docs/registry/open-in-v0) / [shadcn add](https://ui.shadcn.com/docs/cli#add) compatible registry builder.

## What does zero-configuration mean?

Zero-configuration means you don't need to manually create a `registry.json` file. Simply run `smart-registry`, and it will automatically detect and generate the necessary `registry.json` and `r/<registry-item>.json` entries for your project.

### Example

Let's take a complex component as an example. Normally, you would need to manually declare all the registry dependencies, dependencies, and files in the `registry.json` file.

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "comp-485",
      "type": "registry:component",
      "registryDependencies": [
        "https://originui.com/r/alert-dialog.json",
        "https://originui.com/r/badge.json",
        "https://originui.com/r/button.json",
        "https://originui.com/r/checkbox.json",
        "https://originui.com/r/dropdown-menu.json",
        "https://originui.com/r/input.json",
        "https://originui.com/r/label.json",
        "https://originui.com/r/pagination.json",
        "https://originui.com/r/popover.json",
        "https://originui.com/r/select.json",
        "https://originui.com/r/table.json"
      ],
      "dependencies": ["@tanstack/react-table"],
      "files": [
        {
          "path": "registry/default/components/comp-485.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

With `smart-registry`, you can skip the manual declaration of dependencies, files, and registry items. The tool will automatically detect and generate the required `registry.json` and `r/<registry-item>.json` entries for your project.

```bash
rm -rf registry.json
```

Or, you can manually edit the `registry.json` file to remove the unnecessary declarations:

```diff
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "comp-485",
      "type": "registry:component",
-      "registryDependencies": [
-        "https://originui.com/r/alert-dialog.json",
-        "https://originui.com/r/badge.json",
-        "https://originui.com/r/button.json",
-        "https://originui.com/r/checkbox.json",
-        "https://originui.com/r/dropdown-menu.json",
-        "https://originui.com/r/input.json",
-        "https://originui.com/r/label.json",
-        "https://originui.com/r/pagination.json",
-        "https://originui.com/r/popover.json",
-        "https://originui.com/r/select.json",
-        "https://originui.com/r/table.json"
-      ],
-      "dependencies": ["@tanstack/react-table"],
-      "files": [
-        {
-          "path": "registry/default/components/comp-485.tsx",
-          "type": "registry:component"
-        }
      ]
    }
  ]
}
```
