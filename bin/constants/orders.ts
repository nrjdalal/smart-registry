export const autoDetectPatterns = [
  "registry/**",
  "src/registry/**",
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
export const registryOrder = {
  default: ["$schema", "name", "homepage", "items"],
  items: {
    default: [
      "$schema",
      "name",
      "type",
      "title",
      "description",
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
        "registry:style",
        "registry:ui",
        "registry:hook",
        "registry:lib",
        "registry:theme",
        "registry:page",
        "registry:file",
        "registry:component",
        "registry:block",
      ],
    },
    files: {
      default: ["type", "target", "content", "path"],
      type: {
        default: [
          "registry:block",
          "registry:component",
          "registry:file",
          "registry:page",
          "registry:theme",
          "registry:lib",
          "registry:hook",
          "registry:ui",
          "registry:style",
        ],
      },
    },
  },
}
