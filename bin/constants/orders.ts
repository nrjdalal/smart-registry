export const autoDetectPatterns = [
  "registry/**",
  [
    "blocks/**",
    "components/**",
    "helpers/**",
    "hooks/**",
    "lib/**",
    "ui/**",
    "utils/**",
  ],
  [
    "src/blocks/**",
    "src/components/**",
    "src/helpers/**",
    "src/hooks/**",
    "src/lib/**",
    "src/ui/**",
    "src/utils/**",
  ],
]

// ref: https://ui.shadcn.com/schema/registry-item.json
export const registry = {
  default: ["$schema", "name", "homepage", "items"],
  items: {
    default: [
      "$schema",
      "name",
      "type",
      "description",
      "title",
      "author",
      "dependencies",
      "devDependencies",
      "registryDependencies",
      "files",
      "tailwind",
      "cssVars",
      "meta",
      "docs",
      "categories",
    ],
    type: {
      default: [
        "registry:block",
        "registry:component",
        "registry:file",
        "registry:hook",
        "registry:lib",
        "registry:page",
        "registry:theme",
        "registry:ui",
      ],
    },
    files: {
      default: ["type", "target", "content", "path"],
      type: {
        default: [
          "registry:block",
          "registry:component",
          "registry:file",
          "registry:hook",
          "registry:lib",
          "registry:page",
          "registry:theme",
          "registry:ui",
        ],
      },
    },
  },
}
