import { Button } from "@/registry/default/ui/button"
import { LoaderCircleIcon } from "lucide-react"

export default function Component() {
  return (
    <Button disabled>
      <LoaderCircleIcon
        className="-ms-1 animate-spin"
        size={16}
        aria-hidden="true"
      />
      Button
    </Button>
  )
}
