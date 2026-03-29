"use client";

import { useProfile } from "@/hooks/use-profile";
import { PROFILES, type ProfileId } from "@/lib/constants";
import { useRouter } from "next/navigation";

export function ProfileSelector() {
  const { setProfile } = useProfile();
  const router = useRouter();

  function handleSelect(id: ProfileId) {
    setProfile(id);
    router.push("/feed");
  }

  return (
    <div className="stagger-children flex flex-col gap-5 w-full max-w-sm mx-auto">
      {PROFILES.map((profile) => (
        <button
          key={profile.id}
          onClick={() => handleSelect(profile.id)}
          className="btn-craft group relative flex items-center gap-5 w-full rounded-full border border-coffee-espresso bg-white px-6 py-4 text-left transition-all hover:bg-coffee-cream"
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-heading text-2xl font-medium text-white"
            style={{ backgroundColor: profile.color }}
          >
            {profile.initials}
          </div>
          <div>
            <p className="font-heading text-2xl tracking-tight text-coffee-espresso">
              {profile.name}
            </p>
            <p className="text-sm text-coffee-brown">Tap to enter</p>
          </div>
          <svg
            className="ml-auto h-5 w-5 text-coffee-brown transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
