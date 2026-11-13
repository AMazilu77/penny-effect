// Generates the browser icons from ONE source image: `pnpm icons`.
//
//   source:  public/brand/logo.svg (or pass another file: `pnpm icons public/brand/logo.png`)
//   writes:  src/app/favicon.ico      16, 32 and 48 px (browser tab)
//            src/app/icon.png         512 px (modern browsers, Android)
//            src/app/apple-icon.png   180 px on white (iPhone/iPad home screen)
//
// Next.js serves files with these names in src/app automatically and adds
// the <link> tags itself, so nothing else needs changing. See README →
// "Logo and icons".
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const source = process.argv[2] ?? "public/brand/logo.svg";
const input = readFileSync(source);

/** A square PNG of `size` px with the logo centered, `pad` fraction of empty margin. */
function square(size, { pad = 0.06, background = { r: 0, g: 0, b: 0, alpha: 0 } } = {}) {
  const inner = Math.round(size * (1 - 2 * pad));
  return sharp(input, { density: 600 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: Math.floor((size - inner) / 2),
      bottom: Math.ceil((size - inner) / 2),
      left: Math.floor((size - inner) / 2),
      right: Math.ceil((size - inner) / 2),
      background,
    })
    .flatten(background.alpha === 1 ? { background } : false)
    .png()
    .toBuffer();
}

/** An .ico file holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const favicons = await Promise.all(sizes.map(async (size) => ({ size, data: await square(size, { pad: 0.02 }) })));
writeFileSync("src/app/favicon.ico", ico(favicons));
writeFileSync("src/app/icon.png", await square(512));
// iOS shows the icon on a rounded square and ignores transparency, so use white with more margin.
writeFileSync(
  "src/app/apple-icon.png",
  await square(180, { pad: 0.14, background: { r: 255, g: 255, b: 255, alpha: 1 } }),
);
console.log(`Icons generated from ${source}: src/app/favicon.ico, icon.png, apple-icon.png`);
