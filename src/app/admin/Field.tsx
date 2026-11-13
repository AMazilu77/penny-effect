// A labelled admin form field with helper text underneath, and an error
// message when the field failed validation. Helper text and error are
// linked to the input (aria-describedby) so screen readers announce them.
import { cloneElement, type ReactElement, type ReactNode } from "react";

export function Field({
  id,
  label,
  help,
  error,
  extra,
  children,
}: {
  id: string;
  label: string;
  help: string;
  error?: string;
  /** Shown next to the help text, e.g. a live character count. */
  extra?: ReactNode;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>;
}) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-heading">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": error ? `${errorId} ${helpId}` : helpId,
        "aria-invalid": error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4">
        <p id={helpId} className="text-sm text-muted">
          {help}
        </p>
        {extra}
      </div>
    </div>
  );
}
