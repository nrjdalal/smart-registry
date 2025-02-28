export const resolvePath = (
  filepath: string,
  aliases: Record<string, string>,
) => {
  return Object.entries(aliases).reduce(
    (acc, [alias, realPath]) => acc.replace(alias, realPath),
    filepath,
  )
}
