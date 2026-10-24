// Removes metadata (EXIF incl. GPS, XMP, IPTC, comments, text chunks) from uploaded photos before they are
// stored, without decoding or re-encoding the image. No library: JPEG segments, PNG chunks and WebP (RIFF)
// chunks are copied except the metadata ones. A JPEG's EXIF Orientation is kept (as a minimal EXIF block
// holding only that tag) so phone photos are not shown sideways. See docs/functions/post-property/desc.md.

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export function stripMetadata(input: ArrayBuffer | Uint8Array, mime: ImageMime): Uint8Array {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (mime === 'image/jpeg') return stripJpeg(b);
  if (mime === 'image/png') return stripPng(b);
  return stripWebp(b);
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

// ---------- JPEG ----------
// Kept APPn segments: APP0 (JFIF), APP2 (ICC colour profile), APP14 (Adobe colour transform). Everything else
// before the image data — APP1 (EXIF / XMP), APP13 (IPTC), other APPn and COM — is dropped.
const JPEG_KEEP = new Set([0xe0, 0xe2, 0xee]);

/** EXIF Orientation (1–8) from an APP1 "Exif" payload, or null. */
function exifOrientation(seg: Uint8Array): number | null {
  if (seg.length < 14 || String.fromCharCode(...seg.subarray(0, 4)) !== 'Exif') return null;
  const t = seg.subarray(6); // TIFF header
  const le = t[0] === 0x49 && t[1] === 0x49;
  if (!le && !(t[0] === 0x4d && t[1] === 0x4d)) return null;
  const u16 = (o: number) => (le ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1]);
  const u32 = (o: number) => (le ? (t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24)) >>> 0 : ((t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) >>> 0);
  const ifd = u32(4);
  if (ifd + 2 > t.length) return null;
  const n = u16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 12 > t.length) break;
    if (u16(e) === 0x0112) { const v = u16(e + 8); return v >= 1 && v <= 8 ? v : null; }
  }
  return null;
}

/** A complete APP1 segment holding only the Orientation tag (little-endian TIFF, one IFD entry). */
function orientationSegment(orientation: number): Uint8Array {
  const body = [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, // "II", 42, IFD0 at offset 8
    0x01, 0x00, // one entry
    0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00, // 0x0112 SHORT ×1 = orientation
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ];
  const len = body.length + 2;
  return new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff, ...body]);
}

function stripJpeg(b: Uint8Array): Uint8Array {
  if (b[0] !== 0xff || b[1] !== 0xd8) return b;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let orientation: number | null = null;
  let insertAt = 1; // after SOI, or after APP0 when present
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b; // not a marker where one is expected: leave the file untouched
    const marker = b[i + 1];
    if (marker === 0xff) { i++; continue; } // fill byte
    if (marker === 0xda || marker === 0xd9) { parts.push(b.subarray(i)); i = b.length; break; } // image data: copy the rest
    const len = (b[i + 2] << 8) | b[i + 3];
    const end = i + 2 + len;
    if (len < 2 || end > b.length) return b;
    const isApp = marker >= 0xe0 && marker <= 0xef;
    if (marker === 0xe1) orientation ??= exifOrientation(b.subarray(i + 4, end));
    if ((isApp && !JPEG_KEEP.has(marker)) || marker === 0xfe) { i = end; continue; }
    parts.push(b.subarray(i, end));
    if (marker === 0xe0) insertAt = parts.length;
    i = end;
  }
  if (orientation && orientation !== 1) parts.splice(insertAt, 0, orientationSegment(orientation));
  return concat(parts);
}

// ---------- PNG ----------
const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

function stripPng(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = String.fromCharCode(...b.subarray(i + 4, i + 8));
    const end = i + 12 + len;
    if (end > b.length) return b;
    if (!PNG_DROP.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return concat(parts);
}

// ---------- WebP ----------
function stripWebp(b: Uint8Array): Uint8Array {
  if (String.fromCharCode(...b.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...b.subarray(8, 12)) !== 'WEBP') return b;
  const chunks: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const fourcc = String.fromCharCode(...b.subarray(i, i + 4));
    const size = (b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24)) >>> 0;
    const end = i + 8 + size + (size & 1);
    if (end > b.length + 1) return b;
    if (fourcc !== 'EXIF' && fourcc !== 'XMP ') {
      const chunk = b.slice(i, Math.min(end, b.length));
      if (fourcc === 'VP8X') chunk[8] &= ~(0x08 | 0x04); // clear the EXIF and XMP flags
      chunks.push(chunk);
    }
    i = end;
  }
  const body = concat(chunks);
  const size = body.length + 4;
  const head = new Uint8Array([0x52, 0x49, 0x46, 0x46, size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >>> 24) & 0xff, 0x57, 0x45, 0x42, 0x50]);
  return concat([head, body]);
}
