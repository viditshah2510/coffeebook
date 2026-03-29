export const dynamic = "force-dynamic";

import { getEntryById } from "@/server/queries/entry-queries";
import { notFound } from "next/navigation";
import { HeaderBar } from "@/components/header-bar";
import { ROAST_LEVELS, BREW_TYPES } from "@/lib/constants";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Edit,
  Timer,
  Weight,
  CircleDot,
  Coffee,
  Mountain,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { DeleteEntryButton } from "@/components/delete-entry-button";

interface EntryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const { id } = await params;
  const entry = await getEntryById(id);
  if (!entry) notFound();

  const roast = ROAST_LEVELS.find((r) => r.value === entry.roastLevel);
  const brew = BREW_TYPES.find((b) => b.value === entry.brewType);
  const flavors = entry.flavorNotes
    ?.split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  return (
    <div className="min-h-dvh bg-background">
      <HeaderBar />

      <main className="mx-auto max-w-lg px-4 pb-12 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 text-sm text-coffee-brown hover:text-coffee-espresso"
          >
            <ArrowLeft className="h-4 w-4" />
            Feed
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/entry/${entry.id}/edit`}
              data-testid="edit-entry"
              className="flex h-8 w-8 items-center justify-center rounded-full text-coffee-brown hover:bg-coffee-cream"
            >
              <Edit className="h-4 w-4" />
            </Link>
            <DeleteEntryButton id={entry.id} />
          </div>
        </div>

        {/* Photos */}
        {entry.photos.length > 0 && (
          <div className="mb-6 space-y-2">
            {entry.photos.map((photo, i) => (
              <div
                key={photo.id}
                className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-coffee-light-cream"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.blobUrl}
                  alt={`${entry.coffeeName} photo ${i + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>
        )}

        {/* Author */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: entry.profile.color }}
          >
            {entry.profile.initials}
          </div>
          <div>
            <p className="font-medium text-coffee-espresso">
              {entry.profile.name}
            </p>
            <p className="text-xs text-coffee-brown">
              {format(new Date(entry.createdAt + "Z"), "MMM d, yyyy")} &middot;{" "}
              {formatDistanceToNow(new Date(entry.createdAt + "Z"), {
                addSuffix: true,
              })}
            </p>
          </div>
          {entry.rating != null && entry.rating > 0 && (
            <div className="ml-auto flex items-center gap-1 rounded-full bg-coffee-gold/15 px-3 py-1.5">
              <span className="text-sm font-semibold text-coffee-gold">
                {entry.rating.toFixed(1)}/10
              </span>
            </div>
          )}
        </div>

        {/* Title + Roastery + Estate */}
        <h1 className="font-heading text-3xl font-medium tracking-tight text-coffee-espresso">
          {entry.coffeeName}
        </h1>
        {entry.roastery && (
          <p className="mt-1 text-lg text-coffee-brown">
            {entry.roastery.name}
          </p>
        )}
        {entry.estate ? (
          <div className="mt-1 space-y-0.5">
            <p className="text-sm text-coffee-brown/70">{entry.estate.name}</p>
            <div className="flex flex-wrap gap-3 text-xs text-coffee-brown/60">
              {entry.estate.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {entry.estate.location}
                </span>
              )}
              {entry.estate.country && <span>{entry.estate.country}</span>}
              {entry.estate.masl && (
                <span className="flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  {entry.estate.masl} MASL
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            {entry.origin && (
              <p className="mt-1 text-lg text-coffee-brown">{entry.origin}</p>
            )}
            {entry.location && (
              <p className="mt-0.5 text-sm text-coffee-brown/70">
                {entry.location}
              </p>
            )}
          </>
        )}

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {brew && (
            <span className="inline-flex items-center rounded-full bg-coffee-teal px-3 py-1.5 text-sm font-medium text-white">
              {brew.label}
            </span>
          )}
          {roast && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: roast.color }}
            >
              {roast.label} Roast
            </span>
          )}
          {flavors?.map((flavor) => (
            <span
              key={flavor}
              className="rounded-full border border-coffee-brown/20 bg-coffee-cream px-3 py-1.5 text-sm text-coffee-brown"
            >
              {flavor}
            </span>
          ))}
        </div>

        {/* Brew params */}
        {(entry.coffeeWeight || entry.shotWeight || entry.brewTime || entry.grindSize || entry.grinderType) && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entry.coffeeWeight != null && (
              <div className="flex flex-col items-center rounded-xl bg-coffee-cream p-4">
                <Weight className="mb-1 h-5 w-5 text-coffee-brown" />
                <span className="font-heading text-xl font-medium text-coffee-espresso">
                  {entry.coffeeWeight}g
                </span>
                <span className="text-xs text-coffee-brown">Bean Weight</span>
              </div>
            )}
            {entry.shotWeight != null && (
              <div className="flex flex-col items-center rounded-xl bg-coffee-cream p-4">
                <Coffee className="mb-1 h-5 w-5 text-coffee-brown" />
                <span className="font-heading text-xl font-medium text-coffee-espresso">
                  {entry.shotWeight}g
                </span>
                <span className="text-xs text-coffee-brown">Shot Weight</span>
              </div>
            )}
            {entry.brewTime != null && (
              <div className="flex flex-col items-center rounded-xl bg-coffee-cream p-4">
                <Timer className="mb-1 h-5 w-5 text-coffee-brown" />
                <span className="font-heading text-xl font-medium text-coffee-espresso">
                  {entry.brewTime}s
                </span>
                <span className="text-xs text-coffee-brown">Brew Time</span>
              </div>
            )}
            {entry.grindSize && (
              <div className="flex flex-col items-center rounded-xl bg-coffee-cream p-4">
                <CircleDot className="mb-1 h-5 w-5 text-coffee-brown" />
                <span className="font-heading text-lg font-medium text-coffee-espresso">
                  {entry.grindSize}
                </span>
                <span className="text-xs text-coffee-brown">Grind Size</span>
              </div>
            )}
            {entry.grinderType && (
              <div className="flex flex-col items-center rounded-xl bg-coffee-cream p-4 col-span-2 sm:col-span-1">
                <span className="font-heading text-base font-medium text-coffee-espresso">
                  {entry.grinderType}
                </span>
                <span className="text-xs text-coffee-brown">Grinder</span>
              </div>
            )}
          </div>
        )}

        {/* Taste Notes */}
        {entry.tasteNotes && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Taste Notes
            </h2>
            <p className="whitespace-pre-wrap text-coffee-espresso leading-relaxed">
              {entry.tasteNotes}
            </p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div className="mt-6">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-coffee-brown">
              Notes
            </h2>
            <p className="whitespace-pre-wrap text-coffee-espresso leading-relaxed">
              {entry.notes}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
