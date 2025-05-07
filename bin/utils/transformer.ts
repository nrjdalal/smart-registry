import path from "node:path"

export const transformer = ({
  cwd,
  aliases,
  filepath,
}: {
  cwd: string
  aliases: Record<string, string>
  filepath: string
}) => {
  const originalFilepath = filepath

  for (const alias in aliases) {
    filepath = filepath.replace(
      aliases[alias].replaceAll("./", "").replaceAll("../", ""),
      "",
    )
  }

  const transformedPath = filepath.startsWith("registry/")
    ? filepath
        .replace(/^registry\//, "")
        .replace(
          /^(?:([^\/]*)\/)?blocks\//,
          (_, p1) => `blocks/${p1 ? p1 + "/" : ""}`,
        )
        .replace(
          /^(?:([^\/]*)\/)?charts\//,
          (_, p1) => `charts/${p1 ? p1 + "/" : ""}`,
        )
        .replace(
          /^(?:([^\/]*)\/)?components\/ui\//,
          (_, p1) => `${p1 ? p1 + "/" : ""}ui/`,
        )
        .replace(
          /^(?:([^\/]*)\/)?components\//,
          (_, p1) => `components/${p1 ? p1 + "/" : ""}`,
        )
        .replace(
          /^(?:([^\/]*)\/)?hooks\//,
          (_, p1) => `hooks/${p1 ? p1 + "/" : ""}`,
        )
        .replace(
          /^(?:([^\/]*)\/)?lib\//,
          (_, p1) => `lib/${p1 ? p1 + "/" : ""}`,
        )
        .replace(
          /^(?:([^\/]*)\/)?ui\//,
          (_, p1) => `components/ui/${p1 ? p1 + "/" : ""}`,
        )
        .replace(/\/default\//, "/")
        .replace(/^default\//, "")
        .replace(/\.\.\//g, "")
        .replace(/\.\//g, "")
        .replace(/^charts\//, "components/charts/")
    : filepath
        .replace(/\/default\//, "/")
        .replace(/^default\//, "")
        .replace(/\.\.\//g, "")
        .replace(/\.\//g, "")

  let name = transformedPath
    .toLowerCase()
    .replace(
      /^(blocks|components\/charts|components\/ui|components|hooks|lib|utils|helpers)\//,
      "",
    )
    .replace(
      /\/(blocks|components\/charts|components\/ui|components|hooks|lib|utils|helpers)\//,
      "/",
    )
    .replace(/\.[^\/.]+$/, "")
    .replace(/\/index$/, "")
    .replace(/\/page$/, "")
    .replace(/\/route$/, "")
    .replace(/\/\[.*\]$/, "")
    .replace(/(\b\w+)\b\/\1\b/g, "$1")
    .replace(/\//g, "-")

  return {
    type: transformedPath.endsWith("page.tsx")
      ? "registry:page"
      : transformedPath.endsWith(".css")
        ? "registry:style"
        : transformedPath
            .match(
              /^(blocks|components\/charts|components\/ui|components|hooks|lib|utils|helpers)/,
            )?.[1]
            .replace("blocks", "registry:block")
            .replace("components/charts", "registry:component")
            .replace("components/ui", "registry:ui")
            .replace("components", "registry:component")
            .replace("hooks", "registry:hook")
            .replace("lib", "registry:lib")
            .replace("utils", "registry:lib")
            .replace("helpers", "registry:lib") || "registry:file",
    name,
    import:
      "@/" +
      transformedPath
        .replace(cwd + path.sep, "")
        .replace(/\.[^/.]+$/, "")
        .replace(/\/index$/, ""),
    // TODO: better way to handle this
    target:
      originalFilepath.split("/").length > 1
        ? transformedPath.startsWith("blocks/") &&
          transformedPath.endsWith("page.tsx")
          ? transformedPath.replace(/^blocks\//, "app/")
          : transformedPath
        : `~/${transformedPath}`,
    path: filepath,
  }
}
