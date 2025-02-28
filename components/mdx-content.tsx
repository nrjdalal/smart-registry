import * as runtime from "react/jsx-runtime"

const sharedComponents = {}

export const MDXContent = ({
  content,
  components,
}: {
  content: string
  components?: Record<string, React.ComponentType>
}) => {
  const Component = new Function(content)({ ...runtime }).default
  return <Component components={{ ...sharedComponents, ...components }} />
}
