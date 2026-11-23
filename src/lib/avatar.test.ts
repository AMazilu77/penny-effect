import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { AVATAR_MAX_BYTES, AVATAR_SIZE, checkAvatarUpload, sniffImageType, uploadTooLarge } from "./avatar";
import { AvatarImageError, makeAvatar } from "./avatar-image";

async function image(format: "png" | "jpeg" | "webp" | "gif", width = 600, height = 400): Promise<Uint8Array> {
  const base = sharp({ create: { width, height, channels: 3, background: { r: 27, g: 107, b: 60 } } });
  return new Uint8Array(await base.toFormat(format).toBuffer());
}

describe("sniffImageType", () => {
  it("recognizes JPEG, PNG and WebP from their bytes", async () => {
    expect(sniffImageType(await image("jpeg"))).toBe("image/jpeg");
    expect(sniffImageType(await image("png"))).toBe("image/png");
    expect(sniffImageType(await image("webp"))).toBe("image/webp");
  });

  it("refuses GIF, SVG, HTML and empty input", async () => {
    expect(sniffImageType(await image("gif"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("<!doctype html><p>hi"))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe("checkAvatarUpload", () => {
  it("accepts a real PNG declared as PNG", async () => {
    const bytes = await image("png");
    expect(checkAvatarUpload({ type: "image/png", size: bytes.length }, bytes)).toEqual({ ok: true, type: "image/png" });
  });

  it("goes by the real bytes when the browser mislabels one of our types", async () => {
    const bytes = await image("jpeg");
    expect(checkAvatarUpload({ type: "image/png", size: bytes.length }, bytes)).toEqual({ ok: true, type: "image/jpeg" });
  });

  it("refuses an empty upload", () => {
    expect(checkAvatarUpload({ type: "image/png", size: 0 }, new Uint8Array())).toMatchObject({ ok: false, status: 400 });
  });

  it("refuses anything over 2 MB with 413", async () => {
    const bytes = new Uint8Array(AVATAR_MAX_BYTES + 1);
    bytes.set(await image("png"));
    expect(checkAvatarUpload({ type: "image/png", size: bytes.length }, bytes)).toMatchObject({ ok: false, status: 413 });
  });

  it("allows exactly 2 MB", async () => {
    const bytes = new Uint8Array(AVATAR_MAX_BYTES);
    bytes.set(await image("png"));
    expect(checkAvatarUpload({ type: "image/png", size: bytes.length }, bytes).ok).toBe(true);
  });

  it("refuses types we don't accept, even with a valid image inside", async () => {
    const png = await image("png");
    for (const type of ["image/gif", "image/svg+xml", "image/heic", "text/html", ""]) {
      expect(checkAvatarUpload({ type, size: png.length }, png)).toMatchObject({ ok: false, status: 400 });
    }
  });

  it("refuses a file that claims to be a picture but isn't", async () => {
    const html = new TextEncoder().encode("<script>alert(1)</script>");
    expect(checkAvatarUpload({ type: "image/jpeg", size: html.length }, html)).toMatchObject({ ok: false, status: 400 });
    const gif = await image("gif");
    expect(checkAvatarUpload({ type: "image/png", size: gif.length }, gif)).toMatchObject({ ok: false, status: 400 });
  });
});

describe("uploadTooLarge", () => {
  it("refuses a Content-Length clearly over the limit before reading the body", () => {
    expect(uploadTooLarge(String(10 * 1024 * 1024))).toBe(true);
    expect(uploadTooLarge("abc")).toBe(true);
    expect(uploadTooLarge(String(AVATAR_MAX_BYTES + 1000))).toBe(false);
    expect(uploadTooLarge(null)).toBe(false);
  });
});

describe("makeAvatar", () => {
  it("crops to a square, resizes and re-encodes as WebP", async () => {
    for (const format of ["png", "jpeg", "webp"] as const) {
      const out = await makeAvatar(await image(format, 900, 300));
      const meta = await sharp(out).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.width).toBe(AVATAR_SIZE);
      expect(meta.height).toBe(AVATAR_SIZE);
    }
  });

  it("drops metadata such as EXIF (camera, GPS)", async () => {
    const withExif = new Uint8Array(
      await sharp({ create: { width: 300, height: 300, channels: 3, background: "#ffffff" } })
        .jpeg()
        .withExif({ IFD0: { Make: "SecretCam", Copyright: "GPS 51.5,-0.1" } })
        .toBuffer(),
    );
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const out = await makeAvatar(withExif);
    expect((await sharp(out).metadata()).exif).toBeUndefined();
    expect(Buffer.from(out).includes("SecretCam")).toBe(false);
  });

  it("refuses corrupt or truncated images", async () => {
    const png = await image("png");
    await expect(makeAvatar(png.slice(0, 40))).rejects.toBeInstanceOf(AvatarImageError);
    await expect(makeAvatar(new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]))).rejects.toBeInstanceOf(AvatarImageError);
  });

  it("refuses formats we don't accept even if they reach it", async () => {
    await expect(makeAvatar(await image("gif"))).rejects.toBeInstanceOf(AvatarImageError);
  });
});
