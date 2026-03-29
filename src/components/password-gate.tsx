"use client";

import { useState, useEffect } from "react";
import { ProfileSelector } from "./profile-selector";

const PASSWORD = "scale@123";

export function PasswordGate() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("coffeebook-auth") === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === PASSWORD) {
      sessionStorage.setItem("coffeebook-auth", "true");
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (checking) return null;

  if (authenticated) {
    return <ProfileSelector />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full max-w-xs mx-auto">
      <input
        type="password"
        value={pin}
        onChange={(e) => { setPin(e.target.value); setError(false); }}
        placeholder="Enter password"
        autoFocus
        className="w-full rounded-full border border-coffee-espresso bg-white px-6 py-4 text-center font-heading text-lg text-coffee-espresso placeholder:text-coffee-brown/40 focus:border-coffee-gold focus:outline-none focus:ring-2 focus:ring-coffee-gold/30"
      />
      <button
        type="submit"
        className="btn-craft w-full rounded-full border border-coffee-espresso bg-coffee-teal px-6 py-3 font-heading text-lg font-medium text-white"
      >
        Enter
      </button>
      {error && (
        <p className="text-sm text-red-500">Wrong password</p>
      )}
    </form>
  );
}
