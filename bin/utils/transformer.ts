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

  let transformedPath = filepath.startsWith("registry/")
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

  const name = transformedPath
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

  // ~ TODO: handle this better
  transformedPath =
    transformedPath.startsWith("blocks/") &&
    transformedPath.includes("components/")
      ? transformedPath
          .replace(/^blocks\//, "")
          .replace(
            /(?:([^\/]*)\/)?components\//,
            (_, p1) => `components/${p1 ? p1 + "/" : ""}`,
          )
          .replace(/.*?(components\/)/, "$1")
      : transformedPath

  const type = transformedPath.endsWith("page.tsx")
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
          .replace("helpers", "registry:lib") || "registry:file"

  // ~ TODO: handle this better
  transformedPath =
    transformedPath.startsWith("blocks/") &&
    transformedPath.endsWith("page.tsx")
      ? transformedPath.replace(/^blocks\//, "app/")
      : transformedPath

  return {
    type,
    name,
    import:
      "@/" +
      transformedPath
        .replace(cwd + path.sep, "")
        .replace(/\.[^/.]+$/, "")
        .replace(/\/index$/, ""),
    target:
      originalFilepath.split("/").length > 1
        ? transformedPath
        : `~/${transformedPath}`,
    path: filepath,
  }
}
