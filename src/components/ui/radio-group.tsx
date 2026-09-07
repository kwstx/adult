"use client";

import React, { createContext, useContext, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name?: string;
  value?: string | number;
  onChange?: (value: any) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string | number) => void;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  value,
  onValueChange,
  disabled,
  className,
  children,
  ...props
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider
      value={{ name, value, onChange: onValueChange, disabled }}
    >
      <div
        role="radiogroup"
        className={cn("flex flex-col gap-2.5", className)}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string | number;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = forwardRef<HTMLInputElement, RadioItemProps>(
  ({ value, label, description, disabled, className, ...props }, ref) => {
    const context = useContext(RadioGroupContext);
    const isChecked = context.value !== undefined ? context.value === value : props.checked;
    const isDisabled = disabled || context.disabled;

    const handleChange = () => {
      if (!isDisabled && context.onChange) {
        context.onChange(value);
      }
    };

    return (
      <label
        className={cn(
          "inline-flex items-start gap-2.5 cursor-pointer select-none group",
          isDisabled && "opacity-40 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <div className="relative flex items-center justify-center pt-0.5">
          <input
            ref={ref}
            type="radio"
            name={context.name}
            value={value}
            checked={isChecked}
            onChange={handleChange}
            disabled={isDisabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              "h-4 w-4 rounded-full border transition-all duration-150 ease-snappy flex items-center justify-center",
              "bg-surface-base border-white/[0.18]",
              "group-hover:border-white/40",
              "peer-checked:border-accent peer-checked:bg-surface-base",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black"
            )}
          >
            <div
              className={cn(
                "h-2 w-2 rounded-full bg-accent transition-transform duration-150 ease-snappy",
                isChecked ? "scale-100 opacity-100" : "scale-0 opacity-0"
              )}
            />
          </div>
        </div>

        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-zinc-400 mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = "Radio";
