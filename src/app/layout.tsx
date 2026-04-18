import type { Metadata, Viewport } from "next";
import { Alegreya_Sans, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const alegreya = Alegreya_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const ibmPlex = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coffeebook",
  description: "Coffee tasting notes by Karan, Vidit, Amar & Shreyas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coffeebook",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0e4444",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${alegreya.variable} ${ibmPlex.variable}`}>
      <body className="min-h-dvh bg-background font-sans antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#0e4444",
              color: "#fff8f2",
              border: "none",
              fontFamily: "var(--font-body)",
            },
          }}
        />
      </body>
    </html>
  );
}
