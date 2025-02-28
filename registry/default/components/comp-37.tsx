"use client"

import { DateInput, TimeField } from "@/registry/default/ui/datefield-rac"
import { Label } from "react-aria-components"

export default function Component() {
  return (
    <TimeField className="*:not-first:mt-2">
      <Label className="text-foreground text-sm font-medium">Time input</Label>
      <DateInput />
      <p
        className="text-muted-foreground mt-2 text-xs"
        role="region"
        aria-live="polite"
      >
        Built with{" "}
        <a
          className="hover:text-foreground underline"
          href="https://react-spectrum.adobe.com/react-aria/DateField.html"
          target="_blank"
          rel="noopener nofollow"
        >
          React Aria
        </a>
      </p>
    </TimeField>
  )
}
