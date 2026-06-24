import { cn } from "@sparkle/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

export const COUNTER_SIZES = ["xs", "sm", "md"] as const;

// Standalone counters use a soft gradient pill with a 1px drop shadow and a
// subtle text shadow (per the Counter design in Figma). Ghost omits the pill
// fill/drop shadow but keeps the text shadow.
const pillShadow =
  "s-drop-shadow-[0px_1px_0.75px_rgba(0,0,0,0.08)] s-[text-shadow:0px_1px_1.5px_rgba(0,0,0,0.08)]";

const counterVariants = cva(
  "s-inline-flex s-items-center s-justify-center s-rounded-full",
  {
    variants: {
      size: {
        xs: "s-min-w-5 s-px-1 s-py-0.5 s-heading-xs",
        sm: "s-min-w-6 s-px-1 s-py-0.5 s-heading-sm",
        md: "s-min-w-7 s-px-1.5 s-py-0.5 s-heading-base",
      },
      variant: {
        primary: "",
        highlight: "",
        "highlight-secondary": "",
        warning: "",
        "warning-secondary": "",
        info: "",
        outline: "",
        ghost: "",
        "ghost-secondary": "",
      },
      isInButton: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        isInButton: false,
        variant: "primary",
        className: cn(
          "s-bg-gradient-to-b s-from-primary-700 s-to-primary-950 s-text-primary-50",
          pillShadow
        ),
      },
      {
        isInButton: false,
        variant: ["highlight", "highlight-secondary"],
        className: cn(
          "s-bg-gradient-to-b s-from-highlight-light s-to-highlight s-text-white",
          pillShadow
        ),
      },
      {
        isInButton: false,
        variant: ["warning", "warning-secondary"],
        className: cn(
          "s-bg-gradient-to-b s-from-warning-light s-to-warning s-text-white",
          pillShadow
        ),
      },
      {
        isInButton: false,
        variant: "info",
        className: cn(
          "s-bg-gradient-to-b s-from-info-light s-to-info s-text-white",
          pillShadow
        ),
      },
      {
        isInButton: false,
        variant: "outline",
        className: cn(
          "s-bg-gradient-to-b s-from-background s-to-muted-background",
          "s-border s-border-border dark:s-border-border-night",
          "s-text-muted-foreground dark:s-text-muted-foreground-night",
          pillShadow
        ),
      },
      {
        isInButton: false,
        variant: ["ghost", "ghost-secondary"],
        className:
          "s-text-muted-foreground dark:s-text-muted-foreground-night s-[text-shadow:0px_1px_1.5px_rgba(0,0,0,0.08)]",
      },
      {
        isInButton: true,
        variant: "primary",
        className:
          "s-bg-primary-600 dark:s-bg-primary-400 s-text-white dark:s-text-primary-900",
      },
      {
        isInButton: true,
        variant: ["highlight", "highlight-secondary"],
        className: "s-bg-highlight-400 s-text-white",
      },
      {
        isInButton: true,
        variant: ["warning", "warning-secondary"],
        className: "s-bg-warning-400 s-text-white",
      },
      {
        isInButton: true,
        variant: "info",
        className: "s-bg-info-400 s-text-white",
      },
      {
        isInButton: true,
        variant: "outline",
        className:
          "s-bg-primary-150 dark:s-bg-primary-800 s-text-primary-700 dark:s-text-primary-300",
      },
      {
        isInButton: true,
        variant: ["ghost", "ghost-secondary"],
        className:
          "s-bg-primary-150 dark:s-bg-primary-800 s-text-primary-700 dark:s-text-primary-300",
      },
    ],
    defaultVariants: {
      size: "sm",
      variant: "primary",
      isInButton: false,
    },
  }
);

export interface CounterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof counterVariants> {
  value: number;
}

export const Counter = React.forwardRef<HTMLDivElement, CounterProps>(
  (
    {
      value,
      className,
      size = "sm",
      variant = "primary",
      isInButton = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          counterVariants({ size, variant, isInButton }),
          className
        )}
        {...props}
      >
        {value}
      </div>
    );
  }
);

Counter.displayName = "Counter";
