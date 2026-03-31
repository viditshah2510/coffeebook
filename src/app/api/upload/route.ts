import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_WIDTH = 1200;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Resize with sharp — handles all formats, low memory, fast
    const image = sharp(buffer).rotate(); // .rotate() applies EXIF orientation
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
