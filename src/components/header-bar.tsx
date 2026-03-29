"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/use-profile";
import Link from "next/link";
import { LogOut, Menu, Factory, TreePine } from "lucide-react";

export function HeaderBar() {
  const { profile, clearProfile } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-coffee-brown/10 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link href="/feed" className="font-heading text-xl font-medium tracking-tight text-coffee-espresso">
          Coffeebook
        </Link>
        {profile && (
          <div className="flex items-center gap-2">
            {/* Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-coffee-brown/50 hover:bg-coffee-cream hover:text-coffee-brown"
              >
                <Menu className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-coffee-brown/10 bg-white py-1 shadow-lg">
                    <Link
                      href="/roasteries"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-coffee-espresso hover:bg-coffee-cream"
                    >
                      <Factory className="h-4 w-4 text-coffee-brown" />
                      Roasteries
                    </Link>
                    <Link
                      href="/estates"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-coffee-espresso hover:bg-coffee-cream"
                    >
                      <TreePine className="h-4 w-4 text-coffee-brown" />
                      Estates
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: profile.color }}
              >
                {profile.initials}
              </div>
              <span className="text-sm font-medium text-coffee-espresso">
                {profile.name}
              </span>
            </div>
            <button
              onClick={() => {
                clearProfile();
                window.location.href = "/";
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full text-coffee-brown/50 hover:bg-coffee-cream hover:text-coffee-brown"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
