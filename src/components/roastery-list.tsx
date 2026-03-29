"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRoastery,
  updateRoastery,
  deleteRoastery,
} from "@/server/actions/roastery-actions";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Roastery } from "@/lib/db/schema";

export function RoasteryList({ roasteries }: { roasteries: Roastery[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  function openAdd() {
    setEditingId(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(roastery: Roastery) {
    setEditingId(roastery.id);
    setName(roastery.name);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!name.trim()) return;
    const formData = new FormData();
    formData.set("name", name.trim());

    startTransition(async () => {
      try {
        if (editingId) {
          await updateRoastery(editingId, formData);
          toast.success("Roastery updated");
        } else {
          await createRoastery(formData);
          toast.success("Roastery added");
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
        await deleteRoastery(id);
        toast.success("Roastery deleted");
        router.refresh();
      } catch {
        toast.error("Cannot delete — roastery may be in use");
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
        Add Roastery
      </button>

      {roasteries.length === 0 ? (
        <p className="py-12 text-center text-sm text-coffee-brown">
          No roasteries yet. Add one to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {roasteries.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-coffee-cream/50 px-4 py-3"
            >
              <span className="font-medium text-coffee-espresso">{r.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(r)}
                  className="rounded-full p-2 text-coffee-brown hover:bg-coffee-cream"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
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
              {editingId ? "Edit Roastery" : "Add Roastery"}
            </DialogTitle>
          </DialogHeader>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Subko, Blue Tokai, Third Wave"
              className="rounded-xl border-coffee-brown/20 bg-white text-coffee-espresso placeholder:text-coffee-brown/40"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <DialogFooter>
            <button
              onClick={handleSave}
              disabled={isPending || !name.trim()}
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
