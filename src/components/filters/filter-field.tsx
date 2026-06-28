import * as React from "react";

type FilterFieldProps = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  htmlFor?: string;
  children: React.ReactNode;
};

/**
 * Labeled wrapper for a single filter control: an uppercase, icon-prefixed
 * `<label>` above its `children`. Promoted verbatim from the in-file FilterField
 * that lived in `bank-accounts/page.tsx` so adoption there is a no-regression
 * swap (table-filters R1, R32).
 */
export function FilterField({
  label,
  icon: Icon,
  htmlFor,
  children,
}: FilterFieldProps): React.JSX.Element {
  return (
    <div className="space-y-2 min-w-0">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  );
}
