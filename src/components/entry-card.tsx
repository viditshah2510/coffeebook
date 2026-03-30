import type { CoffeeEntry, EntryPhoto, Profile, Roastery, Estate } from "@/lib/db/schema";
import { ROAST_LEVELS, BREW_TYPES, PROCESS_METHODS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

type EntryWithRelations = CoffeeEntry & {
  profile: Profile;
  photos: EntryPhoto[];
  roastery: Roastery | null;
  estate: Estate | null;
};

export function EntryCard({ entry }: { entry: EntryWithRelations }) {
  const roast = ROAST_LEVELS.find((r) => r.value === entry.roastLevel);
  const brew = BREW_TYPES.find((b) => b.value === entry.brewType);
  const process = PROCESS_METHODS.find((p) => p.value === entry.processMethod);
  const flavors = entry.flavorNotes
    ?.split(",")
    .map((f) => f.trim())
    .filter(Boolean);

  const timeAgo = formatDistanceToNow(new Date(entry.createdAt + "Z"), {
    addSuffix: true,
  });

  return (
    <Link href={`/entry/${entry.id}`} className="block">
      <article className="group rounded-xl bg-coffee-cream/50 p-5 transition-all hover:bg-coffee-cream active:scale-[0.98]">
        {/* Header: Avatar + Name + Time */}
        <div className="mb-3 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: entry.profile.color }}
          >
            {entry.profile.initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-coffee-espresso">
              {entry.profile.name}
            </p>
            <p className="text-xs text-coffee-brown">{timeAgo}</p>
          </div>
          {entry.rating != null && entry.rating > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-coffee-gold/15 px-2.5 py-1">
              <span className="text-xs font-medium text-coffee-gold">
                {entry.rating.toFixed(1)}/10
              </span>
            </div>
          )}
        </div>

        {/* Photo */}
        {entry.photos.length > 0 && (
          <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-coffee-light-cream">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.photos[0].blobUrl}
              alt={entry.coffeeName}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {entry.photos.length > 1 && (
              <div className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                +{entry.photos.length - 1}
              </div>
            )}
          </div>
        )}

        {/* Coffee name + roastery + estate */}
        <h3 className="font-heading text-xl font-medium tracking-tight text-coffee-espresso">
          {entry.coffeeName}
        </h3>
        {entry.roastery && (
          <p className="mt-0.5 text-sm text-coffee-brown">
            {entry.roastery.name}
          </p>
        )}
        {entry.estate ? (
          <p className="mt-0.5 text-xs text-coffee-brown/70">
            {entry.estate.name}
            {entry.estate.location && ` — ${entry.estate.location}`}
            {entry.estate.country && `, ${entry.estate.country}`}
          </p>
        ) : (
          <>
            {entry.origin && (
              <p className="mt-0.5 text-sm text-coffee-brown">{entry.origin}</p>
            )}
            {entry.location && (
              <p className="mt-0.5 text-xs text-coffee-brown/70">
                {entry.location}
              </p>
            )}
          </>
        )}

        {/* Tags row: brew type + roast + flavors */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {brew && (
            <span className="inline-flex items-center rounded-full bg-coffee-teal px-2.5 py-1 text-xs font-medium text-white">
              {brew.label}
            </span>
          )}
          {roast && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: roast.color }}
            >
              {roast.label}
            </span>
          )}
          {process && (
            <span className="inline-flex items-center rounded-full border border-coffee-gold/30 bg-coffee-gold/10 px-2.5 py-1 text-xs font-medium text-coffee-gold">
              {process.label}
            </span>
          )}
          {flavors?.map((flavor) => (
            <span
              key={flavor}
              className="rounded-full border border-coffee-brown/20 bg-white px-2.5 py-1 text-xs text-coffee-brown"
            >
              {flavor}
            </span>
          ))}
        </div>

        {/* Brew params (compact) */}
        {(entry.coffeeWeight || entry.shotWeight || entry.brewTime || entry.grindSize) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-coffee-brown/80">
            {entry.coffeeWeight && (
              <span>{entry.coffeeWeight}g in</span>
            )}
            {entry.shotWeight && (
              <span>{entry.shotWeight}g out</span>
            )}
            {entry.brewTime && (
              <span>{entry.brewTime}s</span>
            )}
            {entry.grindSize && (
              <span>grind {entry.grindSize}</span>
            )}
          </div>
        )}

        {/* Best Had / Niche Recipe */}
        {(entry.bestHad || entry.nicheRecipe) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-coffee-brown/80">
            {entry.bestHad && (
              <span>Best: {entry.bestHad}</span>
            )}
            {entry.nicheRecipe && (
              <span>Recipe: {entry.nicheRecipe}</span>
            )}
          </div>
        )}

        {/* Notes preview */}
        {entry.notes && (
          <p className="mt-2 line-clamp-2 text-sm text-coffee-espresso/70">
            {entry.notes}
          </p>
        )}
      </article>
    </Link>
  );
}
