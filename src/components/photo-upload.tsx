"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  photos: string[];
  onChange: (updater: string[] | ((prev: string[]) => string[])) => void;
  onPhotosAdded?: (urls: string[]) => void;
}

async function resizeImage(file: File, maxWidth = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
          } else {
            // toBlob failed (e.g., WebP not supported), fall back to original
            resolve(file);
          }
        },
        "image/webp",
        0.82
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export function PhotoUpload({ photos, onChange, onPhotosAdded }: PhotoUploadProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const resized = await resizeImage(file);
        const url = await uploadFile(resized);
        newUrls.push(url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Photo upload failed. Please try again.");
    }
    if (newUrls.length > 0) {
      onChange((prev) => [...prev, ...newUrls]);
      if (onPhotosAdded) onPhotosAdded(newUrls);
    }
    setUploading(false);
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
            <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-coffee-light-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
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

      {/* Upload buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="btn-craft flex flex-1 items-center justify-center gap-2 rounded-full border border-coffee-espresso bg-white px-4 py-3 text-sm font-medium text-coffee-espresso disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Add Photo
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="btn-craft flex items-center justify-center gap-2 rounded-full border border-coffee-brown/20 bg-white px-4 py-3 text-sm font-medium text-coffee-brown disabled:opacity-50"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
