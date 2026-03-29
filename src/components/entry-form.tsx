"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { ROAST_LEVELS } from "@/lib/constants";
import { createEntry, updateEntry } from "@/server/actions/entry-actions";
import { PhotoUpload } from "./photo-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CoffeeEntry, EntryPhoto } from "@/lib/db/schema";

interface EntryFormProps {
  entry?: CoffeeEntry & { photos: EntryPhoto[] };
}

export function EntryForm({ entry }: EntryFormProps) {
  const { profileId } = useProfile();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<string[]>(
    entry?.photos.map((p) => p.blobUrl) ?? []
  );
  const [activeRoast, setActiveRoast] = useState(entry?.roastLevel ?? "");
  const [rating, setRating] = useState(entry?.rating ?? 0);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Form state for ALL fields (controlled)
  const [formValues, setFormValues] = useState({
    coffeeName: entry?.coffeeName ?? "",
    origin: entry?.origin ?? "",
    location: entry?.location ?? "",
    flavorNotes: entry?.flavorNotes ?? "",
    coffeeWeight: entry?.coffeeWeight?.toString() ?? "",
    brewTime: entry?.brewTime?.toString() ?? "",
    grindSize: entry?.grindSize ?? "",
    notes: entry?.notes ?? "",
  });

  async function handleOcr(imageUrl: string) {
    setOcrLoading(true);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (!res.ok) throw new Error("OCR failed");
      const data = await res.json();

      setFormValues((prev) => ({
        ...prev,
        coffeeName: data.coffee_name || prev.coffeeName,
        origin: data.origin || prev.origin,
        flavorNotes: data.flavor_notes || prev.flavorNotes,
        coffeeWeight: data.coffee_weight?.toString() || prev.coffeeWeight,
      }));

      if (data.roast_level) {
        const match = ROAST_LEVELS.find(
          (r) =>
            r.value === data.roast_level ||
            r.label.toLowerCase() === data.roast_level?.toLowerCase()
        );
        if (match) setActiveRoast(match.value);
      }

      toast.success("Label scanned! Review the auto-filled fields.");
    } catch {
      toast.error("Could not read the label. Try a clearer photo.");
    }
    setOcrLoading(false);
  }

  function handleSubmit(formData: FormData) {
    if (!profileId) {
      toast.error("Please select a profile first");
      router.push("/");
      return;
    }

    formData.set("profileId", profileId);
    formData.set("roastLevel", activeRoast);
    formData.set("rating", rating ? rating.toString() : "");
    formData.set("coffeeName", formValues.coffeeName);
    formData.set("origin", formValues.origin);
    formData.set("location", formValues.location);
    formData.set("flavorNotes", formValues.flavorNotes);
    formData.set("coffeeWeight", formValues.coffeeWeight);
    formData.set("brewTime", formValues.brewTime);
    formData.set("grindSize", formValues.grindSize);
    formData.set("notes", formValues.notes);
    photos.forEach((url, i) => formData.set(`photo_${i}`, url));

    startTransition(async () => {
      try {
        if (entry) {
          await updateEntry(entry.id, formData);
          toast.success("Entry updated!");
        } else {
          const result = await createEntry(formData);
          toast.success("Entry saved!");
          router.push(`/entry/${result.id}`);
          return;
        }
        router.push("/feed");
      } catch (err) {
        toast.error("Something went wrong");
        console.error(err);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* OCR loading indicator */}
      {ocrLoading && (
        <div className="flex items-center gap-2 rounded-xl bg-coffee-gold/10 px-4 py-3 text-sm text-coffee-gold">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading label...
        </div>
      )}

      {/* Section: Photo (moved to top) */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Photo
        </h2>
        <PhotoUpload
          photos={photos}
          onChange={setPhotos}
          onPhotoAdded={handleOcr}
        />
      </section>

      {/* Section: Coffee Info */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Coffee
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Name *
            </label>
            <Input
              name="coffeeName"
              value={formValues.coffeeName}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, coffeeName: e.target.value }))
              }
              placeholder="e.g., Bili hu, Naivo, Half Light"
              required
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                Origin / Estate
              </label>
              <Input
                name="origin"
                value={formValues.origin}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, origin: e.target.value }))
                }
                placeholder="e.g., Moolay Estate"
                className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                Location
              </label>
              <Input
                name="location"
                value={formValues.location}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, location: e.target.value }))
                }
                placeholder="e.g., Pune"
                className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section: Roast Level */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Roast Level
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {ROAST_LEVELS.map((roast) => (
            <button
              key={roast.value}
              type="button"
              onClick={() =>
                setActiveRoast(activeRoast === roast.value ? "" : roast.value)
              }
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-all ${
                activeRoast === roast.value
                  ? "text-white ring-2 ring-coffee-gold ring-offset-2"
                  : "bg-coffee-cream text-coffee-brown hover:bg-coffee-light-cream"
              }`}
              style={
                activeRoast === roast.value
                  ? { backgroundColor: roast.color }
                  : undefined
              }
            >
              <div
                className="h-6 w-6 rounded-full border border-white/30"
                style={{ backgroundColor: roast.color }}
              />
              {roast.label}
            </button>
          ))}
        </div>
      </section>

      {/* Section: Brewing */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Brewing
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Weight
            </label>
            <div className="relative">
              <Input
                name="coffeeWeight"
                type="number"
                step="0.5"
                value={formValues.coffeeWeight}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, coffeeWeight: e.target.value }))
                }
                placeholder="16"
                className="rounded-xl border-coffee-brown/20 bg-white pr-6 text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-coffee-brown/50">
                g
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Time
            </label>
            <div className="relative">
              <Input
                name="brewTime"
                type="number"
                value={formValues.brewTime}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, brewTime: e.target.value }))
                }
                placeholder="20"
                className="rounded-xl border-coffee-brown/20 bg-white pr-6 text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-coffee-brown/50">
                s
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Grind
            </label>
            <Input
              name="grindSize"
              value={formValues.grindSize}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, grindSize: e.target.value }))
              }
              placeholder="4-5"
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
            />
          </div>
        </div>
      </section>

      {/* Section: Tasting */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Tasting
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Flavor Notes
            </label>
            <Input
              name="flavorNotes"
              value={formValues.flavorNotes}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, flavorNotes: e.target.value }))
              }
              placeholder="e.g., peanut butter, chocolate, citrus"
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Rating
            </label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className={`flex h-9 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${
                    n <= rating
                      ? "bg-coffee-gold text-white"
                      : "bg-coffee-cream text-coffee-brown hover:bg-coffee-light-cream"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Notes
            </label>
            <Textarea
              name="notes"
              value={formValues.notes}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, notes: e.target.value }))
              }
              placeholder="Your thoughts on this coffee..."
              rows={3}
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
            />
          </div>
        </div>
      </section>

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-craft w-full rounded-full border border-coffee-espresso bg-coffee-teal px-6 py-4 font-heading text-lg font-medium text-white disabled:opacity-50"
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving...
          </span>
        ) : entry ? (
          "Update Entry"
        ) : (
          "Save Entry"
        )}
      </button>
    </form>
  );
}
