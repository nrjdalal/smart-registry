import { glob } from "tinyglobby"

export const listFiles = async ({
  cwd,
  patterns = ["**", ".**"],
  ignore = [],
}: {
  cwd: string
  patterns?: string | string[]
  ignore?: string | string[]
}) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  patterns = patterns.flatMap((pattern) => {
    return !pattern.includes("*") ? [pattern + ".*", pattern + "/**"] : pattern
  })
  patterns = patterns.filter(Boolean)
  ignore =
    typeof ignore === "string"
      ? ignore.split(",").map((str) => str.trim())
      : ignore
  ignore = ignore.filter(Boolean)
  const files = await glob(patterns, {
    cwd,
    ignore: ignore.filter((ig) => !patterns.includes(ig)),
  })
  return files
}
