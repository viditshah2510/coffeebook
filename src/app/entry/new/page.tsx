import { EntryForm } from "@/components/entry-form";
import { HeaderBar } from "@/components/header-bar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewEntryPage() {
  return (
    <div className="min-h-dvh bg-background">
      <HeaderBar />

      <main className="mx-auto max-w-lg px-4 pb-12 pt-4">
        <Link
          href="/feed"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-coffee-brown hover:text-coffee-espresso"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <h1 className="mb-6 font-heading text-3xl font-medium tracking-tight text-coffee-espresso">
          New Entry
        </h1>

        <EntryForm />
      </main>
    </div>
  );
}
