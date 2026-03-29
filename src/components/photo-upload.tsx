"use client";

import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { uploadPhoto } from "@/server/actions/photo-actions";

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  onLabelPhoto?: (url: string) => void;
}

async function resizeImage(file: File, maxWidth = 1200): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    img.onload = () => {
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
            resolve(file);
          }
        },
        "image/webp",
        0.82
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

export function PhotoUpload({ photos, onChange, onLabelPhoto }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList, isLabel = false) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const resized = await resizeImage(file);
        const formData = new FormData();
        formData.set("file", resized);
        const { url } = await uploadPhoto(formData);
        onChange([...photos, url]);
        if (isLabel && onLabelPhoto) {
          onLabelPhoto(url);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
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
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-craft flex flex-1 items-center justify-center gap-2 rounded-full border border-coffee-espresso bg-white px-4 py-3 text-sm font-medium text-coffee-espresso disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Add Photo
        </button>

        {onLabelPhoto && (
          <button
            type="button"
            onClick={() => labelInputRef.current?.click()}
            disabled={uploading}
            className="btn-craft flex flex-1 items-center justify-center gap-2 rounded-full border border-coffee-gold bg-coffee-gold/10 px-4 py-3 text-sm font-medium text-coffee-gold disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
            )}
            Scan Label
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <input
        ref={labelInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files, true)}
      />
    </div>
  );
}
