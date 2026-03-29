export const dynamic = "force-dynamic";

import { getEntryById } from "@/server/queries/entry-queries";
import { notFound } from "next/navigation";
import { EntryForm } from "@/components/entry-form";
import { HeaderBar } from "@/components/header-bar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EditEntryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { id } = await params;
  const entry = await getEntryById(id);
  if (!entry) notFound();

  return (
    <div className="min-h-dvh bg-background">
      <HeaderBar />

      <main className="mx-auto max-w-lg px-4 pb-12 pt-4">
        <Link
          href={`/entry/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-coffee-brown hover:text-coffee-espresso"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-6 font-heading text-3xl font-medium tracking-tight text-coffee-espresso">
          Edit Entry
        </h1>

        <EntryForm entry={entry} />
      </main>
    </div>
  );
}
