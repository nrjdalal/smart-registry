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
  filepath = filepath.replace(cwd + path.sep, "")
  const transformedPath = filepath.startsWith("registry/")
    ? filepath
        .replace(/^registry\//, "")
        .replace(
          /^(?:([^\/]*)\/)?blocks\//,
          (_, p1) => `blocks/${p1 ? p1 + "/" : ""}`,
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
        .replace(/\.\.\//g, "")
        .replace(/\.\//g, "")
    : filepath
        .replace(/\/default\//, "/")
        .replace(/\.\.\//g, "")
        .replace(/\.\//g, "")
  return {
    type: transformedPath.endsWith("page.tsx")
      ? "registry:page"
      : transformedPath
          .match(
            /^(blocks|components\/ui|components|hooks|lib|utils|helpers)/,
          )?.[1]
          .replace("blocks", "registry:block")
          .replace("components/ui", "registry:ui")
          .replace("components", "registry:component")
          .replace("hooks", "registry:hook")
          .replace("lib", "registry:lib")
          .replace("utils", "registry:lib")
          .replace("helpers", "registry:lib") || "registry:file",
    name: transformedPath
      .replace(
        /^(blocks|components\/ui|components|hooks|lib|utils|helpers)\//,
        "",
      )
      .replace(/\.[^\/.]+$/, ""),
    import:
      "@/" +
      transformedPath.replace(cwd + path.sep, "").replace(/\.[^/.]+$/, ""),
    target: transformedPath,
    path: filepath,
  }
}
