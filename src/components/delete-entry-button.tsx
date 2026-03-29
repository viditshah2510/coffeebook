"use client";

import { deleteEntry } from "@/server/actions/entry-actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function DeleteEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this entry?")) return;
    startTransition(async () => {
      await deleteEntry(id);
      toast.success("Entry deleted");
      router.push("/feed");
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex h-8 w-8 items-center justify-center rounded-full text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
