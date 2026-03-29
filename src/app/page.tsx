import { PasswordGate } from "@/components/password-gate";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-coffee-cream px-6 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="font-heading text-5xl font-medium tracking-tight text-coffee-espresso sm:text-6xl">
          Coffeebook
        </h1>
        <p className="mt-3 text-lg text-coffee-brown">
          Tasting notes & brewing journal
        </p>
        <div className="mx-auto mt-4 h-px w-16 bg-coffee-gold" />
      </div>

      {/* Profile selection */}
      <PasswordGate />

      {/* Footer */}
      <p className="mt-12 text-xs text-coffee-brown/50">
        By Karan, Vidit & Amar
      </p>
    </main>
  );
}
