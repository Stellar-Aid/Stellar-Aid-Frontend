import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake } from "lucide-react";
import { Toaster } from "sonner";
import { WalletProvider } from "@/components/WalletProvider";
import { WalletButton } from "@/components/WalletButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "StellarAid — Transparent milestone grants on Stellar",
  description:
    "A donor & transparency dApp for the StellarAid milestone-based grant platform on Stellar / Soroban.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
              <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  <HeartHandshake className="h-6 w-6 text-primary" />
                  <span>StellarAid</span>
                </Link>
                <nav className="flex items-center gap-4">
                  <Link
                    href="/"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Home
                  </Link>
                  <Link
                    href="/create"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Create
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                  <WalletButton />
                </nav>
              </div>
            </header>
            <main className="container flex-1 py-10">{children}</main>
            <footer className="border-t py-6 text-center text-sm text-muted-foreground">
              StellarAid · Built on Stellar &amp; Soroban · Radical transparency
              for grant funding
            </footer>
          </div>
          <Toaster richColors position="top-right" />
        </WalletProvider>
      </body>
    </html>
  );
}
