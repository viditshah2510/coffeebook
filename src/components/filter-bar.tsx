"use client";

import { PROFILES, ROAST_LEVELS } from "@/lib/constants";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeProfile = searchParams.get("profile") || "";
  const activeRoast = searchParams.get("roast") || "";

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/feed?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-3">
      {/* Profile filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("profile", "")}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
            !activeProfile
              ? "bg-coffee-teal text-white"
              : "bg-coffee-cream text-coffee-brown hover:bg-coffee-light-cream"
          }`}
        >
          All
        </button>
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilter("profile", p.id === activeProfile ? "" : p.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              activeProfile === p.id
                ? "text-white"
                : "bg-coffee-cream text-coffee-brown hover:bg-coffee-light-cream"
            }`}
            style={activeProfile === p.id ? { backgroundColor: p.color } : undefined}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Roast filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilter("roast", "")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            !activeRoast
              ? "bg-coffee-espresso text-white"
              : "border border-coffee-brown/20 bg-white text-coffee-brown"
          }`}
        >
          All Roasts
        </button>
        {ROAST_LEVELS.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilter("roast", r.value === activeRoast ? "" : r.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              activeRoast === r.value
                ? "text-white"
                : "border border-coffee-brown/20 bg-white text-coffee-brown"
            }`}
            style={activeRoast === r.value ? { backgroundColor: r.color } : undefined}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
