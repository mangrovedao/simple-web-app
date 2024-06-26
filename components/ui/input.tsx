"use client";

/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as React from "react";
import { NumericFormat } from "react-number-format";

import { getSeparator } from "@/utils/numbers";
import { cn } from "@/utils";

enum InputType {
  NUMBER = "number",
  PERCENT = "percent",
  TEXT = "text",
}

const inputClasses =
  "flex h-14 w-full px-4 py-3 rounded-lg border focus:border-input group-hover/input:!border-green-caribbean active:!border-green-bangladesh transition-all bg-muted text-md placeholder:text-muted-foreground focus-visible:!outline-none disabled:cursor-not-allowed disabled:bg-gray-scale-600 disabled:!border-transparent disabled:text-gray-scale-300";
const errorClasses = "!border-red-100 group-hover/input:!border-red-100";
const disabledClasses = "border-none";

export type InputProps = {
  value?: string | number | null | undefined;
  allowNegative?: boolean;
  decimals?: number;
  onInput?: ({
    value,
    floatValue,
    formattedValue,
  }: {
    value: string;
    floatValue?: number;
    formattedValue: string;
  }) => void;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = InputType.NUMBER,
      allowNegative = false,
      decimals,
      onInput,
      onChange,
      value = undefined,
      placeholder,
      disabled,
      name,
      ...rest
    },
    ref
  ) => {
    const decimalSeparator = getSeparator();
    return type === InputType.TEXT ? (
      <input
        ref={ref}
        type={type}
        className={cn(
          inputClasses,
          disabled ? disabledClasses : undefined,
          rest["aria-invalid"] ? errorClasses : undefined,
          className
        )}
        onInput={onInput}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        name={name}
        {...rest}
      />
    ) : (
      <NumericFormat
        // @ts-expect-error
        ref={ref}
        className={cn(
          inputClasses,
          disabled ? disabledClasses : undefined,
          rest["aria-invalid"] ? errorClasses : undefined,
          className
        )}
        allowNegative={allowNegative}
        decimalScale={decimals}
        decimalSeparator={decimalSeparator}
        placeholder={placeholder}
        value={value}
        onInput={onInput}
        onChange={onChange}
        disabled={disabled}
        name={name}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
