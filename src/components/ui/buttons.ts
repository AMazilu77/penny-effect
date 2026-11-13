// Class names for links and buttons, so every page uses the same three kinds.
export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-hover";
export const buttonSecondary =
  "inline-flex items-center justify-center gap-2 rounded-control border bg-card px-4 py-2 text-sm font-semibold text-fg hover:bg-inset";
export const textLink = "font-medium text-link underline";

export const chip = (active: boolean) =>
  `inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${
    active ? "border-primary bg-primary text-on-primary" : "bg-card text-fg hover:bg-inset"
  }`;
