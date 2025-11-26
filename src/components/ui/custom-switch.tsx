"use client";

import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
} from "react-hook-form";

import { Switch } from "./switch";
import { Label } from "./label";

type CustomSwitchProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
> = {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function CustomSwitch<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  disabled,
}: CustomSwitchProps<TFieldValues, TName>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <Switch
              id={field.name}
              checked={!!field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
            />
            <Label htmlFor={field.name} className="text-sm font-medium">
              {label}
            </Label>
          </div>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
    />
  );
}