import { Button } from "@/registry/default/ui/button"
import { TrashIcon } from "lucide-react"

export default function Component() {
  return (
    <Button variant="destructive">
      <TrashIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
      Button
    </Button>
  )
}
