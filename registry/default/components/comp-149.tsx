import { Checkbox } from "@/registry/default/ui/checkbox"
import { useId } from "react"

export default function Component() {
  const id = useId()

  const items = [
    { value: "1", label: "Monday", defaultChecked: true },
    { value: "2", label: "Tuesday", defaultChecked: true },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday", defaultChecked: true },
    { value: "5", label: "Friday", defaultChecked: true },
    { value: "6", label: "Saturday" },
    { value: "7", label: "Sunday", disabled: true },
  ]

  return (
    <fieldset className="space-y-4">
      <legend className="text-foreground text-sm leading-none font-medium">
        Days of the week
      </legend>
      <div className="flex gap-1.5">
        {items.map((item) => (
          <label
            key={`${id}-${item.value}`}
            className="border-input has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary has-data-[state=checked]:text-primary-foreground has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative flex size-9 cursor-pointer flex-col items-center justify-center gap-3 rounded-full border text-center shadow-xs transition-[color,box-shadow] outline-none has-focus-visible:ring-[3px] has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50"
          >
            <Checkbox
              id={`${id}-${item.value}`}
              value={item.value}
              className="sr-only after:absolute after:inset-0"
              defaultChecked={item.defaultChecked}
              disabled={item.disabled}
            />
            <span aria-hidden="true" className="text-sm font-medium">
              {item.label[0]}
            </span>
            <span className="sr-only">{item.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
