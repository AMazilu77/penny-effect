// Profile picture uploads (Milestone 3.5): what we accept. Pure and
// unit-tested; the image work is in ./avatar-image.ts.

/** Largest upload: 2 MB. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** What the browser may send. GIF, SVG (can contain scripts) and HEIC are refused. */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];
/** The stored picture is a square this many pixels wide. */
export const AVATAR_SIZE = 256;

/**
 * The real type of an image from its first bytes ("magic numbers"),
 * whatever the file name or the browser claims. Null if it's none of ours.
 */
export function sniffImageType(bytes: Uint8Array): AvatarType | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // "RIFF" <4-byte size> "WEBP"
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export type AvatarCheck = { ok: true; type: AvatarType } | { ok: false; status: 400 | 413; error: string };

const WRONG_TYPE = "Use a JPEG, PNG or WebP picture.";

/**
 * Checks an upload before any image work: present, at most 2 MB, declared as
 * one of our types, and its bytes really are one of our types.
 */
export function checkAvatarUpload(file: { type: string; size: number }, bytes: Uint8Array): AvatarCheck {
  if (file.size === 0 || bytes.length === 0) return { ok: false, status: 400, error: "Choose a picture to upload." };
  if (file.size > AVATAR_MAX_BYTES || bytes.length > AVATAR_MAX_BYTES) {
    return { ok: false, status: 413, error: "That picture is over 2 MB. Choose a smaller one." };
  }
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return { ok: false, status: 400, error: WRONG_TYPE };
  const real = sniffImageType(bytes);
  if (!real) return { ok: false, status: 400, error: WRONG_TYPE };
  return { ok: true, type: real };
}

/**
 * Whether a request's Content-Length is too big to be a valid upload, so we
 * can refuse it before reading the body. Multipart adds a little overhead
 * around the file. A missing header is allowed (the file size is checked
 * again after reading).
 */
export function uploadTooLarge(contentLength: string | null): boolean {
  if (!contentLength) return false;
  const n = Number(contentLength);
  return !Number.isFinite(n) || n > AVATAR_MAX_BYTES + 64 * 1024;
}
