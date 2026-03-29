"use client";

import { useCallback, useSyncExternalStore } from "react";
import { PROFILES, type ProfileId } from "@/lib/constants";

const STORAGE_KEY = "coffeebook-profile";

function getSnapshot(): ProfileId | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && PROFILES.some((p) => p.id === stored)) {
    return stored as ProfileId;
  }
  return null;
}

function getServerSnapshot(): ProfileId | null {
  return null;
}

const listeners = new Set<() => void>();
function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useProfile() {
  const profileId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const profile = profileId ? PROFILES.find((p) => p.id === profileId) ?? null : null;

  const setProfile = useCallback((id: ProfileId) => {
    localStorage.setItem(STORAGE_KEY, id);
    // Set cookie for server components
    document.cookie = `coffeebook-profile=${id};path=/;max-age=31536000;samesite=lax`;
    listeners.forEach((l) => l());
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.cookie = "coffeebook-profile=;path=/;max-age=0";
    listeners.forEach((l) => l());
  }, []);

  return { profileId, profile, setProfile, clearProfile };
}
