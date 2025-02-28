import { Label } from "@/registry/default/ui/label"
import { Textarea } from "@/registry/default/ui/textarea"
import { useId } from "react"

export default function Component() {
  const id = useId()
  return (
    <div className="*:not-first:mt-2">
      <Label htmlFor={id}>Textarea with gray background</Label>
      <Textarea
        id={id}
        className="bg-muted border-transparent shadow-none"
        placeholder="Leave a comment"
      />
    </div>
  )
}
