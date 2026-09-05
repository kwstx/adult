import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { GlobalNavigation } from "@/components/navigation/GlobalNavigation";

export const metadata: Metadata = {
  title: "AuraLive | Next-Gen Interactive Live Streaming & Creator Platform",
  description:
    "Video-first live discovery, instant token interaction engine, double-entry ledger, and 18 U.S.C. 2257 compliance vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-zinc-100 antialiased selection:bg-pink-500 selection:text-white">
        <UserProvider>
          <div className="relative flex min-h-screen bg-black">
            {/* Global Navigation: Narrow Left Rail on Desktop (72px), Quiet Bottom Bar on Mobile */}
            <GlobalNavigation />

            {/* Main Application Canvas */}
            <main className="flex-1 lg:pl-[72px] pb-14 lg:pb-0 min-h-screen overflow-x-hidden">
              {children}
            </main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
