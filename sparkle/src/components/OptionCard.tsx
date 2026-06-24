import { Card } from "@sparkle/components/Card";
import { Counter } from "@sparkle/components/Counter";
import { cn } from "@sparkle/lib/utils";
import React from "react";

interface OptionCardSharedProps {
  counterValue?: number;
  selected?: boolean;
  disabled?: boolean;
  disableHover?: boolean;
  className?: string;
  onFocusCapture?: React.FocusEventHandler<HTMLDivElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
}

interface OptionCardOptionProps extends OptionCardSharedProps {
  type?: "option";
  label: string;
  description?: string | null;
  onClick?: () => void;
}

interface OptionCardInputProps extends OptionCardSharedProps {
  // Input state (mirrors Figma's `State=Input`): a free-text "type something
  // else" option. The field is rendered and styled by OptionCard (borderless,
  // faint placeholder); the card keeps the same chrome and counter.
  type: "input";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  name?: string;
  id?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export type OptionCardProps = OptionCardOptionProps | OptionCardInputProps;

export function OptionCard(props: OptionCardProps) {
  const {
    counterValue,
    selected = false,
    disabled = false,
    disableHover = false,
    className,
    onFocusCapture,
    onMouseEnter,
  } = props;

  const isInput = props.type === "input";
  const onClick = isInput ? undefined : props.onClick;
  const isInteractive = onClick !== undefined && !disabled;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      variant="tertiary"
      size="sm"
      className={cn(
        "s-w-full s-items-center s-gap-2 s-text-left s-transition-colors",
        isInteractive && "s-cursor-pointer",
        // In input mode `disabled` targets the field, not the card chrome.
        !isInput && disabled && "s-pointer-events-none s-opacity-60",
        // Selected state is a flat "transparency-selected" overlay (6% of the
        // foreground), kept stable on hover.
        selected &&
          "s-bg-foreground/[0.06] hover:s-bg-foreground/[0.06] dark:s-bg-foreground-night/[0.06] dark:hover:s-bg-foreground-night/[0.06]",
        // In input mode, focusing the field selects the option.
        isInput &&
          "focus-within:s-bg-foreground/[0.06] dark:focus-within:s-bg-foreground-night/[0.06]",
        !selected &&
          !disableHover &&
          !isInput &&
          "hover:s-bg-muted-background/60 dark:hover:s-bg-muted-background-night/60",
        className
      )}
      onClick={disabled ? undefined : onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      onFocusCapture={onFocusCapture}
      onMouseEnter={onMouseEnter}
      tabIndex={
        isInput ? undefined : disabled ? -1 : isInteractive ? 0 : undefined
      }
      aria-pressed={isInteractive ? selected : undefined}
    >
      {counterValue !== undefined && (
        <Counter
          value={counterValue}
          size="xs"
          variant="outline"
          className="s-shrink-0"
        />
      )}
      <div className="s-flex s-min-w-0 s-flex-1 s-flex-col">
        {props.type === "input" ? (
          <input
            ref={props.inputRef}
            type="text"
            id={props.id}
            name={props.name}
            value={props.value}
            placeholder={props.placeholder}
            disabled={disabled}
            onChange={(e) => props.onChange(e.target.value)}
            onFocus={props.onFocus}
            onBlur={props.onBlur}
            onKeyDown={props.onKeyDown}
            className={cn(
              "s-w-full s-border-0 s-bg-transparent s-p-0 s-shadow-none s-outline-none",
              "s-copy-sm s-text-foreground dark:s-text-foreground-night",
              "placeholder:s-text-faint dark:placeholder:s-text-faint-night",
              "disabled:s-cursor-not-allowed"
            )}
          />
        ) : (
          <>
            <span className="s-text-sm s-font-medium s-text-foreground dark:s-text-foreground-night">
              {props.label}
            </span>
            {props.description && (
              <span className="s-text-xs s-text-muted-foreground dark:s-text-muted-foreground-night">
                {props.description}
              </span>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
