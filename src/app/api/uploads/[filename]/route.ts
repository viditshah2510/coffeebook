import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  const safe = path.basename(filename);
  const filepath = path.join(UPLOAD_DIR, safe);

  try {
    const buffer = await readFile(filepath);
    let contentType = "image/webp";
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = "image/jpeg";
    else if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
