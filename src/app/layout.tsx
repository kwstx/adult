import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "AuraLive | Next-Gen Adult Creator & Streaming Platform",
  description:
    "Real-time interactive live streaming, double-entry credit ledger, creator operating system, and 2257 compliance vault.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-pink-500 selection:text-white">
        <UserProvider>
          <div className="relative flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
