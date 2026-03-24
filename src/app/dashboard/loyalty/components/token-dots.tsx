"use client";

import { cn } from "@/lib/utils";

type TokenDotsProps = {
  tokens: number;
  max?: number;
  size?: "sm" | "md" | "lg";
};

export function TokenDots({ tokens, max = 8, size = "md" }: TokenDotsProps) {
  const sizeClass = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  }[size];

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full border-2 transition-colors",
            sizeClass,
            i < tokens
              ? "border-emerald-500 bg-emerald-500"
              : "border-border bg-background",
          )}
        />
      ))}
    </div>
  );
}
