"use client";

import { useState, useId } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  photos: string[];
  onChange: (updater: string[] | ((prev: string[]) => string[])) => void;
  onPhotosAdded?: (urls: string[]) => void;
}

const RESIZE_TIMEOUT_MS = 10000;
const MAX_WIDTH = 1200;

async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(file), RESIZE_TIMEOUT_MS);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = document.createElement("img");
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width <= MAX_WIDTH) {
              clearTimeout(timeout);
              resolve(file);
              return;
            }
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              clearTimeout(timeout);
              resolve(file);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                clearTimeout(timeout);
                if (blob) {
                  resolve(
                    new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
                      type: "image/jpeg",
                    })
                  );
                } else {
                  resolve(file);
                }
              },
              "image/jpeg",
              0.85
            );
          } catch {
            clearTimeout(timeout);
            resolve(file);
          }
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve(file);
        };
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        clearTimeout(timeout);
        resolve(file);
      };
      reader.readAsDataURL(file);
    } catch {
      clearTimeout(timeout);
      resolve(file);
    }
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

export function PhotoUpload({
  photos,
  onChange,
  onPhotosAdded,
}: PhotoUploadProps) {
  const id = useId();
  const galleryId = `${id}-gallery`;
  const cameraId = `${id}-camera`;
  const [uploading, setUploading] = useState(false);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;

    // Copy files into array immediately — iOS may invalidate the FileList
    const fileArray = Array.from(files);

    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of fileArray) {
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
    // Reset input value so the same file can be re-selected
    e.target.value = "";
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

      {/* Upload buttons — <label> for reliable iOS Safari file input triggering */}
      <div className="flex gap-2">
        <label
          htmlFor={galleryId}
          className={`btn-craft flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-coffee-espresso bg-white px-4 py-3 text-sm font-medium text-coffee-espresso ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Add Photo
        </label>
        <label
          htmlFor={cameraId}
          className={`btn-craft flex cursor-pointer items-center justify-center gap-2 rounded-full border border-coffee-brown/20 bg-white px-4 py-3 text-sm font-medium text-coffee-brown ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <Camera className="h-4 w-4" />
        </label>
      </div>

      <input
        id={galleryId}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFiles}
      />
      <input
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFiles}
      />
    </div>
  );
}
