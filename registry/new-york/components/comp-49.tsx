"use client"

import { Input } from "@/registry/default/ui/input"
import { Label } from "@/registry/default/ui/label"
import { useId } from "react"
import { usePaymentInputs } from "react-payment-inputs"

export default function Component() {
  const id = useId()
  const { getCVCProps } = usePaymentInputs()

  return (
    <div className="*:not-first:mt-2">
      <Label htmlFor={`cvc-${id}`}>Code</Label>
      <Input
        {...getCVCProps()}
        id={`cvc-${id}`}
        className="[direction:inherit]"
      />
      <p
        className="text-muted-foreground mt-2 text-xs"
        role="region"
        aria-live="polite"
      >
        Built with{" "}
        <a
          className="hover:text-foreground underline"
          href="https://github.com/medipass/react-payment-inputs"
          target="_blank"
          rel="noopener nofollow"
        >
          React Payment Inputs
        </a>
      </p>
    </div>
  )
}
