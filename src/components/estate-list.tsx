"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createEstate,
  updateEstate,
  deleteEstate,
} from "@/server/actions/estate-actions";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2, MapPin, Mountain } from "lucide-react";
import { toast } from "sonner";
import type { Estate } from "@/lib/db/schema";

export function EstateList({ estates }: { estates: Estate[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    country: "",
    masl: "",
  });

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", location: "", country: "", masl: "" });
    setDialogOpen(true);
  }

  function openEdit(estate: Estate) {
    setEditingId(estate.id);
    setForm({
      name: estate.name,
      location: estate.location ?? "",
      country: estate.country ?? "",
      masl: estate.masl?.toString() ?? "",
    });
    setDialogOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    const formData = new FormData();
    formData.set("name", form.name.trim());
    formData.set("location", form.location.trim());
    formData.set("country", form.country.trim());
    formData.set("masl", form.masl);

    startTransition(async () => {
      try {
        if (editingId) {
          await updateEstate(editingId, formData);
          toast.success("Estate updated");
        } else {
          await createEstate(formData);
          toast.success("Estate added");
        }
        setDialogOpen(false);
        router.refresh();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteEstate(id);
        toast.success("Estate deleted");
        router.refresh();
      } catch {
        toast.error("Cannot delete — estate may be in use");
      }
    });
  }

  return (
    <>
      <button
        onClick={openAdd}
        className="btn-craft mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-coffee-espresso bg-coffee-teal px-4 py-3 font-heading text-sm font-medium text-white"
      >
        <Plus className="h-4 w-4" />
        Add Estate
      </button>

      {estates.length === 0 ? (
        <p className="py-12 text-center text-sm text-coffee-brown">
          No estates yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {estates.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl bg-coffee-cream/50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium text-coffee-espresso">
                  {e.name}
                </span>
                <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-coffee-brown">
                  {e.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {e.location}
                    </span>
                  )}
                  {e.country && <span>{e.country}</span>}
                  {e.masl && (
                    <span className="flex items-center gap-1">
                      <Mountain className="h-3 w-3" />
                      {e.masl} MASL
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => openEdit(e)}
                  className="rounded-full p-2 text-coffee-brown hover:bg-coffee-cream"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={isPending}
                  className="rounded-full p-2 text-coffee-brown hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Estate" : "Add Estate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="e.g., Coorg, Karnataka"
                  className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
                  Country
                </label>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
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
                value={form.masl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, masl: e.target.value }))
                }
                placeholder="e.g., 1200"
                className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={handleSave}
              disabled={isPending || !form.name.trim()}
              className="btn-craft w-full rounded-lg bg-coffee-teal px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : editingId ? (
                "Update"
              ) : (
                "Add"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
