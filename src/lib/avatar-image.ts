// Turns an accepted upload into the stored profile picture. Server-only.
//
// sharp (libvips) decodes the image, applies the camera's rotation, crops the
// centre to a square, resizes it to AVATAR_SIZE and re-encodes it as WebP.
// Re-encoding means we never store or serve the uploaded bytes themselves,
// and it drops all metadata (EXIF, including GPS location). Animated images
// keep only their first frame.
import sharp from "sharp";
import { AVATAR_SIZE } from "@/lib/avatar";

// A decompression bomb is a small file that claims enormous dimensions. Refuse
// anything over 40 megapixels before decoding it (a 2 MB photo is far below).
const MAX_INPUT_PIXELS = 40_000_000;

export class AvatarImageError extends Error {}

export async function makeAvatar(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const image = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error", pages: 1 });
    const { format } = await image.metadata();
    if (format !== "jpeg" && format !== "png" && format !== "webp") throw new AvatarImageError("unsupported format");
    const out = await image
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
    return new Uint8Array(out);
  } catch (err) {
    if (err instanceof AvatarImageError) throw err;
    // Corrupt, truncated or too large: sharp's own message stays in the logs only.
    throw new AvatarImageError("could not process image");
  }
}
