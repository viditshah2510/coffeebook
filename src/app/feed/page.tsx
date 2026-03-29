import { Suspense } from "react";
import { getEntries } from "@/server/queries/entry-queries";
import { getRoasteries } from "@/server/queries/roastery-queries";
import { getEstates } from "@/server/queries/estate-queries";
import { EntryCard } from "@/components/entry-card";
import { FilterBar } from "@/components/filter-bar";
import { Plus } from "lucide-react";
import Link from "next/link";
import { HeaderBar } from "@/components/header-bar";

export const dynamic = "force-dynamic";

interface FeedPageProps {
  searchParams: Promise<{
    profile?: string;
    roast?: string;
    roastery?: string;
    estate?: string;
    search?: string;
  }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const [entries, roasteries, estates] = await Promise.all([
    getEntries({
      profileId: params.profile,
      roastLevel: params.roast,
      roasteryId: params.roastery,
      estateId: params.estate,
      search: params.search,
    }),
    getRoasteries(),
    getEstates(),
  ]);

  return (
    <div className="min-h-dvh bg-background">
      <HeaderBar />

      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {/* Filters */}
        <Suspense>
          <FilterBar roasteries={roasteries} estates={estates} />
        </Suspense>

        {/* Entries */}
        <div className="mt-5 space-y-4 stagger-children">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-coffee-cream">
                <span className="text-4xl">&#9749;</span>
              </div>
              <h2 className="font-heading text-xl text-coffee-espresso">
                No entries yet
              </h2>
              <p className="mt-1 text-sm text-coffee-brown">
                Start logging your coffee journey
              </p>
              <Link
                href="/entry/new"
                className="btn-craft mt-6 inline-flex items-center gap-2 rounded-full border border-coffee-espresso bg-coffee-teal px-6 py-3 text-sm font-medium text-white"
              >
                <Plus className="h-4 w-4" />
                Add First Entry
              </Link>
            </div>
          ) : (
            entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </main>

      {/* FAB */}
      {entries.length > 0 && (
        <Link
          href="/entry/new"
          className="btn-craft fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-coffee-espresso bg-coffee-gold text-white shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}
