import { Label } from "@/registry/default/ui/label"
import { Textarea } from "@/registry/default/ui/textarea"
import { useId } from "react"

export default function Component() {
  const id = useId()
  return (
    <div className="group relative">
      <Label
        htmlFor={id}
        className="bg-background text-foreground absolute start-1 top-0 z-10 block -translate-y-1/2 px-2 text-xs font-medium group-has-disabled:opacity-50"
      >
        Textarea with overlapping label
      </Label>
      <Textarea id={id} />
    </div>
  )
}
