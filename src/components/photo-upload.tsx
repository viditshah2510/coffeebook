"use client";

import { useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  photos: string[];
  onChange: (updater: string[] | ((prev: string[]) => string[])) => void;
  onPhotosAdded?: (urls: string[]) => void;
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}): ${body}`);
  }
  const { url } = await res.json();
  return url;
}

export function PhotoUpload({
  photos,
  onChange,
  onPhotosAdded,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  // Increment key after each use to force a fresh <input> — avoids iOS Safari
  // bug where the change event doesn't re-fire on the same input element.
  const [inputKey, setInputKey] = useState(0);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    // Copy file references immediately — iOS may invalidate the FileList
    const fileArray = Array.from(files);

    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of fileArray) {
        const url = await uploadFile(file);
        newUrls.push(url);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    }
    if (newUrls.length > 0) {
      onChange((prev) => [...prev, ...newUrls]);
      if (onPhotosAdded) onPhotosAdded(newUrls);
    }
    setUploading(false);
    // Remount the input so iOS Safari fires change again on next use
    setInputKey((k) => k + 1);
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="photo-grid mb-3">
          {photos.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg bg-coffee-light-cream"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Single button — iOS natively offers "Take Photo" or "Choose from Library"
          when accept="image/*" without capture attribute. The separate capture button
          caused iOS Safari to silently drop the change event on many versions. */}
      <label
        className={`btn-craft relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-coffee-espresso bg-white px-4 py-3 text-sm font-medium text-coffee-espresso ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {uploading ? "Uploading..." : "Add Photo"}
        <input
          key={inputKey}
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ fontSize: 0 }}
          onChange={handleFiles}
        />
      </label>
    </div>
  );
}
