import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { ToastProvider } from "@/components/ui/toast";
import { AnimationProvider } from "@/modules/animation";
import { GlobalNavigation } from "@/components/navigation/GlobalNavigation";

export const metadata: Metadata = {
  title: "Fansly | Creator Livestream & Monetization Platform",
  description:
    "Live discovery, creator subscriptions, PPV content, paid messaging, virtual-credit transactions, and live interactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#101216] text-zinc-100 antialiased selection:bg-[#00a2f8] selection:text-white">
        <UserProvider>
          <AnimationProvider>
            <ToastProvider>
              <div className="relative flex min-h-screen bg-[#101216]">
                {/* Global Navigation: Left Rail on Desktop (72px), Bottom Bar on Mobile */}
                <GlobalNavigation />

                {/* Main Application Canvas */}
                <main className="flex-1 lg:pl-[72px] pb-14 lg:pb-0 min-h-screen overflow-x-hidden instant-page-transition bg-[#101216]">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </AnimationProvider>
        </UserProvider>
      </body>
    </html>
  );
}
