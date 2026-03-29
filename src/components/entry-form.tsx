"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/use-profile";
import { ROAST_LEVELS, BREW_TYPES } from "@/lib/constants";
import { createEntry, updateEntry } from "@/server/actions/entry-actions";
import { createRoastery } from "@/server/actions/roastery-actions";
import { createEstate } from "@/server/actions/estate-actions";
import { PhotoUpload } from "./photo-upload";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CoffeeEntry, EntryPhoto, Roastery, Estate } from "@/lib/db/schema";

interface EntryFormProps {
  entry?: CoffeeEntry & { photos: EntryPhoto[] };
  roasteries: Roastery[];
  estates: Estate[];
}

export function EntryForm({ entry, roasteries: initialRoasteries, estates: initialEstates }: EntryFormProps) {
  const { profileId } = useProfile();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photos, setPhotos] = useState<string[]>(
    entry?.photos.map((p) => p.blobUrl) ?? []
  );
  const [activeRoast, setActiveRoast] = useState(entry?.roastLevel ?? "");
  const [activeBrew, setActiveBrew] = useState(entry?.brewType ?? "");
  const [rating, setRating] = useState(entry?.rating ?? 0);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Roastery & Estate
  const [roasteryId, setRoasteryId] = useState(entry?.roasteryId ?? "");
  const [estateId, setEstateId] = useState(entry?.estateId ?? "");
  const [roasteries, setRoasteries] = useState(initialRoasteries);
  const [estates, setEstates] = useState(initialEstates);

  // Add new dialogs
  const [showAddRoastery, setShowAddRoastery] = useState(false);
  const [newRoasteryName, setNewRoasteryName] = useState("");
  const [showAddEstate, setShowAddEstate] = useState(false);
  const [newEstate, setNewEstate] = useState({ name: "", location: "", country: "", masl: "" });

  // Form state for ALL fields (controlled)
  const [formValues, setFormValues] = useState({
    coffeeName: entry?.coffeeName ?? "",
    origin: entry?.origin ?? "",
    location: entry?.location ?? "",
    flavorNotes: entry?.flavorNotes ?? "",
    coffeeWeight: entry?.coffeeWeight?.toString() ?? "",
    shotWeight: entry?.shotWeight?.toString() ?? "",
    brewTime: entry?.brewTime?.toString() ?? "",
    grindSize: entry?.grindSize ?? "",
    grinderType: entry?.grinderType ?? "",
    tasteNotes: entry?.tasteNotes ?? "",
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

  async function handleAddRoastery() {
    if (!newRoasteryName.trim()) return;
    const formData = new FormData();
    formData.set("name", newRoasteryName.trim());
    try {
      const result = await createRoastery(formData);
      const newR = { id: result.id, name: result.name, createdAt: new Date().toISOString() };
      setRoasteries((prev) => [...prev, newR].sort((a, b) => a.name.localeCompare(b.name)));
      setRoasteryId(result.id);
      setShowAddRoastery(false);
      setNewRoasteryName("");
      toast.success("Roastery added");
    } catch {
      toast.error("Failed to add roastery");
    }
  }

  async function handleAddEstate() {
    if (!newEstate.name.trim()) return;
    const formData = new FormData();
    formData.set("name", newEstate.name.trim());
    formData.set("location", newEstate.location.trim());
    formData.set("country", newEstate.country.trim());
    formData.set("masl", newEstate.masl);
    try {
      const result = await createEstate(formData);
      const newE = {
        id: result.id,
        name: result.name,
        location: newEstate.location.trim() || null,
        country: newEstate.country.trim() || null,
        masl: newEstate.masl ? parseInt(newEstate.masl) : null,
        createdAt: new Date().toISOString(),
      };
      setEstates((prev) => [...prev, newE].sort((a, b) => a.name.localeCompare(b.name)));
      setEstateId(result.id);
      setShowAddEstate(false);
      setNewEstate({ name: "", location: "", country: "", masl: "" });
      toast.success("Estate added");
    } catch {
      toast.error("Failed to add estate");
    }
  }

  function handleSubmit(formData: FormData) {
    if (!profileId) {
      toast.error("Please select a profile first");
      router.push("/");
      return;
    }

    formData.set("profileId", profileId);
    formData.set("roasteryId", roasteryId);
    formData.set("estateId", estateId);
    formData.set("roastLevel", activeRoast);
    formData.set("brewType", activeBrew);
    formData.set("rating", rating ? rating.toString() : "");
    formData.set("coffeeName", formValues.coffeeName);
    formData.set("origin", formValues.origin);
    formData.set("location", formValues.location);
    formData.set("flavorNotes", formValues.flavorNotes);
    formData.set("coffeeWeight", formValues.coffeeWeight);
    formData.set("shotWeight", formValues.shotWeight);
    formData.set("brewTime", formValues.brewTime);
    formData.set("grindSize", formValues.grindSize);
    formData.set("grinderType", formValues.grinderType);
    formData.set("tasteNotes", formValues.tasteNotes);
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

      {/* Section: Photo */}
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

          {/* Roastery */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Roastery
            </label>
            <div className="flex gap-2">
              <Select
                value={roasteryId || undefined}
                onValueChange={(val) => setRoasteryId(val as string)}
              >
                <SelectTrigger className="w-full rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso">
                  <SelectValue placeholder="Select roastery" />
                </SelectTrigger>
                <SelectContent>
                  {roasteries.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setShowAddRoastery(true)}
                className="shrink-0 rounded-xl border border-coffee-brown/20 bg-white px-3 text-coffee-brown hover:bg-coffee-cream"
                title="Add new roastery"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Estate */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Estate
            </label>
            <div className="flex gap-2">
              <Select
                value={estateId || undefined}
                onValueChange={(val) => setEstateId(val as string)}
              >
                <SelectTrigger className="w-full rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso">
                  <SelectValue placeholder="Select estate" />
                </SelectTrigger>
                <SelectContent>
                  {estates.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                      {e.location && (
                        <span className="ml-1 text-coffee-brown/60">
                          — {e.location}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => setShowAddEstate(true)}
                className="shrink-0 rounded-xl border border-coffee-brown/20 bg-white px-3 text-coffee-brown hover:bg-coffee-cream"
                title="Add new estate"
              >
                <Plus className="h-4 w-4" />
              </button>
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

      {/* Section: Brew Type */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Brew Type
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {BREW_TYPES.map((brew) => (
            <button
              key={brew.value}
              type="button"
              onClick={() =>
                setActiveBrew(activeBrew === brew.value ? "" : brew.value)
              }
              className={`rounded-xl px-2 py-2.5 text-xs font-medium transition-all ${
                activeBrew === brew.value
                  ? "bg-coffee-teal text-white ring-2 ring-coffee-gold ring-offset-2"
                  : "bg-coffee-cream text-coffee-brown hover:bg-coffee-light-cream"
              }`}
            >
              {brew.label}
            </button>
          ))}
        </div>
      </section>

      {/* Section: Brewing */}
      <section>
        <h2 className="mb-3 font-heading text-lg font-medium text-coffee-espresso">
          Brewing
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Bean Weight
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
              Shot Weight
            </label>
            <div className="relative">
              <Input
                name="shotWeight"
                type="number"
                step="0.5"
                value={formValues.shotWeight}
                onChange={(e) =>
                  setFormValues((v) => ({ ...v, shotWeight: e.target.value }))
                }
                placeholder="36"
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
                placeholder="25"
                className="rounded-xl border-coffee-brown/20 bg-white pr-6 text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-coffee-brown/50">
                s
              </span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Grind Size
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
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
            Grinder
          </label>
          <Input
            name="grinderType"
            value={formValues.grinderType}
            onChange={(e) =>
              setFormValues((v) => ({ ...v, grinderType: e.target.value }))
            }
            placeholder="e.g., Niche Zero, Baratza Encore"
            className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
          />
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

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Taste Notes
            </label>
            <Textarea
              name="tasteNotes"
              value={formValues.tasteNotes}
              onChange={(e) =>
                setFormValues((v) => ({ ...v, tasteNotes: e.target.value }))
              }
              placeholder="How did this brew taste?"
              rows={2}
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:ring-coffee-gold"
            />
          </div>

          {/* Rating Slider */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wider text-coffee-brown">
                Rating
              </label>
              {rating > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-coffee-gold">
                    {rating.toFixed(1)}/10
                  </span>
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    className="text-xs text-coffee-brown/50 hover:text-coffee-brown"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <Slider
              value={rating}
              onValueChange={(val) => setRating(val as number)}
              min={0}
              max={10}
              step={0.1}
            />
            <div className="mt-1 flex justify-between text-[10px] text-coffee-brown/40">
              <span>0</span>
              <span>5</span>
              <span>10</span>
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

      {/* Add Roastery Dialog */}
      <Dialog open={showAddRoastery} onOpenChange={setShowAddRoastery}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Roastery</DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Name *
            </label>
            <Input
              value={newRoasteryName}
              onChange={(e) => setNewRoasteryName(e.target.value)}
              placeholder="e.g., Subko, Blue Tokai, Third Wave"
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRoastery())}
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={handleAddRoastery}
              disabled={!newRoasteryName.trim()}
              className="btn-craft w-full rounded-lg bg-coffee-teal px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
            >
              Add
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Estate Dialog */}
      <Dialog open={showAddEstate} onOpenChange={setShowAddEstate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Estate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                Name *
              </label>
              <Input
                value={newEstate.name}
                onChange={(e) => setNewEstate((v) => ({ ...v, name: e.target.value }))}
                placeholder="e.g., Moolay Estate, Kerehaklu"
                className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                  Location
                </label>
                <Input
                  value={newEstate.location}
                  onChange={(e) => setNewEstate((v) => ({ ...v, location: e.target.value }))}
                  placeholder="e.g., Coorg, Karnataka"
                  className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                  Country
                </label>
                <Input
                  value={newEstate.country}
                  onChange={(e) => setNewEstate((v) => ({ ...v, country: e.target.value }))}
                  placeholder="e.g., India"
                  className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                Altitude (MASL)
              </label>
              <Input
                type="number"
                value={newEstate.masl}
                onChange={(e) => setNewEstate((v) => ({ ...v, masl: e.target.value }))}
                placeholder="e.g., 1200"
                className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={handleAddEstate}
              disabled={!newEstate.name.trim()}
              className="btn-craft w-full rounded-lg bg-coffee-teal px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
            >
              Add
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
