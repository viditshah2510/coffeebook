export const dynamic = "force-dynamic";

import { getEstates } from "@/server/queries/estate-queries";
import { HeaderBar } from "@/components/header-bar";
import { EstateList } from "@/components/estate-list";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EstatesPage() {
  const estates = await getEstates();

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
          Estates
        </h1>
        <EstateList estates={estates} />
      </main>
    </div>
  );
}
