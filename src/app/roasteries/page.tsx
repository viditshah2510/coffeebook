export const dynamic = "force-dynamic";

import { getRoasteries } from "@/server/queries/roastery-queries";
import { HeaderBar } from "@/components/header-bar";
import { RoasteryList } from "@/components/roastery-list";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function RoasteriesPage() {
  const roasteries = await getRoasteries();

  return (
    <div className="min-h-dvh bg-background">
      <HeaderBar />
      <main className="mx-auto max-w-lg px-4 pb-12 pt-4">
        <Link
          href="/feed"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-coffee-brown hover:text-coffee-espresso"
        >
          <ArrowLeft className="h-4 w-4" />
          Feed
        </Link>
        <h1 className="mb-6 font-heading text-2xl font-medium text-coffee-espresso">
          Roasteries
        </h1>
        <RoasteryList roasteries={roasteries} />
      </main>
    </div>
  );
}
