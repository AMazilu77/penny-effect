// A labelled admin form field with helper text underneath. The helper text
// is linked to the input (aria-describedby) so screen readers announce it.
import { cloneElement, type ReactElement } from "react";

export function Field({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const helpId = `${id}-help`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-heading">
        {label}
      </label>
      {cloneElement(children, { id, "aria-describedby": helpId })}
      <p id={helpId} className="text-sm text-muted">
        {help}
      </p>
    </div>
  );
}
