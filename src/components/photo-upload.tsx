"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const UPLOAD_TIMEOUT_MS = 120_000;

function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.timeout = UPLOAD_TIMEOUT_MS;
    xhr.responseType = "json";

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.url) {
        resolve(xhr.response.url);
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    xhr.ontimeout = () => reject(new Error("Upload timed out — photo may be too large"));

    const formData = new FormData();
    formData.set("file", file);
    xhr.send(formData);
  });
}

interface PhotoUploadProps {
  photos: string[];
  onChange: (updater: string[] | ((prev: string[]) => string[])) => void;
  onPhotosAdded?: (urls: string[]) => void;
}

export function PhotoUpload({ photos, onChange, onPhotosAdded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const callbacksRef = useRef({ onChange, onPhotosAdded });
  callbacksRef.current = { onChange, onPhotosAdded };

  const doUpload = useCallback(async (files: File[]) => {
    if (processingRef.current || !files.length) return;
    processingRef.current = true;
    setUploading(true);

    const newUrls: string[] = [];
    try {
      for (const file of files) {
        if (file.size === 0) continue;
        const url = await uploadFile(file);
        newUrls.push(url);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    }

    if (newUrls.length > 0) {
      callbacksRef.current.onChange((prev) => [...prev, ...newUrls]);
      callbacksRef.current.onPhotosAdded?.(newUrls);
    }

    setUploading(false);
    processingRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  // Fallback for iOS Safari camera flow: when the camera UI is active the page
  // goes to background. On some iOS versions the `change` event doesn't fire
  // when the page returns. Catch those by checking for pending files on
  // visibilitychange.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const input = inputRef.current;
      if (input?.files?.length && !processingRef.current) {
        doUpload(Array.from(input.files));
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [doUpload]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    doUpload(Array.from(files));
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

      {/* iOS natively offers "Take Photo" or "Choose from Library" */}
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
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          style={{ fontSize: 0 }}
          onChange={handleInputChange}
        />
      </label>
    </div>
  );
}
