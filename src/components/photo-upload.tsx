"use client";

import { useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
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
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export function PhotoUpload({
  photos,
  onChange,
  onPhotosAdded,
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const files = input.files;
    if (!files?.length) return;

    // Copy file references immediately — iOS may invalidate the FileList
    const fileArray = Array.from(files);

    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of fileArray) {
        // Upload raw file — no client-side resize.
        // iOS decoding large images into canvas causes memory pressure
        // that kills the Safari tab, blanking the page.
        const url = await uploadFile(file);
        newUrls.push(url);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Photo upload failed. Try again.");
    }
    if (newUrls.length > 0) {
      onChange((prev) => [...prev, ...newUrls]);
      if (onPhotosAdded) onPhotosAdded(newUrls);
    }
    setUploading(false);
    // Reset so same file can be re-selected — defer for iOS
    requestAnimationFrame(() => {
      input.value = "";
    });
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div>
      {/* Photo grid */}
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

      {/* Upload buttons — <label> triggers file input natively, no programmatic .click() needed */}
      <div className="flex gap-2">
        <label
          className={`btn-craft flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-coffee-espresso bg-white px-4 py-3 text-sm font-medium text-coffee-espresso ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Add Photo
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute h-0 w-0 overflow-hidden opacity-0"
            onChange={handleFiles}
          />
        </label>
        <label
          className={`btn-craft flex cursor-pointer items-center justify-center gap-2 rounded-full border border-coffee-brown/20 bg-white px-4 py-3 text-sm font-medium text-coffee-brown ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <Camera className="h-4 w-4" />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="absolute h-0 w-0 overflow-hidden opacity-0"
            onChange={handleFiles}
          />
        </label>
      </div>
    </div>
  );
}
