"use server";

import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export async function uploadPhoto(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  await mkdir(UPLOAD_DIR, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await writeFile(filepath, buffer);

  return { url: `/api/uploads/${filename}` };
}

export async function deletePhoto(url: string) {
  const filename = url.split("/").pop();
  if (!filename) return;
  try {
    await unlink(path.join(UPLOAD_DIR, filename));
  } catch {
    // File may already be deleted
  }
}
