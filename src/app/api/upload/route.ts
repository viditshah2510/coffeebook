import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
// @ts-expect-error — no type declarations for heic-convert
import heicConvert from "heic-convert";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_WIDTH = 1200;

const HEIC_FTYPES = ["ftypmif1", "ftypheic", "ftypheim", "ftypheis", "ftypmsf1"];

function isHeic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const ftype = buffer.subarray(4, 12).toString("ascii");
  return HEIC_FTYPES.some((sig) => ftype.startsWith(sig));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // iOS camera sends HEIC which sharp on Alpine cannot decode (no HEVC codec).
    // Convert to JPEG before passing to sharp.
    if (isHeic(buffer)) {
      const converted = await heicConvert({
        buffer: new Uint8Array(buffer),
        format: "JPEG",
        quality: 0.92,
      });
      buffer = Buffer.from(converted);
    }

    const image = sharp(buffer).rotate();
    const metadata = await image.metadata();
    const needsResize = metadata.width && metadata.width > MAX_WIDTH;

    const processed = needsResize
      ? await image.resize(MAX_WIDTH, undefined, { withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()
      : await image.jpeg({ quality: 85 }).toBuffer();

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const filepath = path.join(UPLOAD_DIR, filename);

    await writeFile(filepath, processed);

    return NextResponse.json({ url: `/api/uploads/${filename}` });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
