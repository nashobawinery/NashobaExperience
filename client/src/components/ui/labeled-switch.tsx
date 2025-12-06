import * as React from "react"
import { cn } from "@/lib/utils"

interface LabeledSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

const LabeledSwitch = React.forwardRef<HTMLButtonElement, LabeledSwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className, "data-testid": testId }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        data-state={checked ? "checked" : "unchecked"}
        data-testid={testId}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-input",
          className
        )}
      >
        <span
          className={cn(
            "pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-lg ring-0 transition-transform text-[9px] font-semibold uppercase",
            checked ? "translate-x-7" : "translate-x-0",
            checked ? "text-primary" : "text-muted-foreground"
          )}
        >
          {checked ? "On" : "Off"}
        </span>
      </button>
    )
  }
)
LabeledSwitch.displayName = "LabeledSwitch"

export { LabeledSwitch }
