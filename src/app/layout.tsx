import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/user-context";
import { ToastProvider } from "@/components/ui/toast";
import { AnimationProvider } from "@/modules/animation";
import { GlobalNavigation } from "@/components/navigation/GlobalNavigation";

const seasonFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-season",
  display: "swap",
});

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
    <html lang="en" className={`dark ${seasonFont.variable}`}>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=switzer@100,200,300,400,500,600,700,800,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#060608] text-zinc-100 antialiased selection:bg-blue-500 selection:text-white">
        <UserProvider>
          <AnimationProvider>
            <ToastProvider>
              <div className="relative flex min-h-screen bg-[#060608] flex-col">
                {/* Main Application Canvas */}
                <main className="flex-1 pb-20 lg:pb-0 min-h-screen overflow-x-hidden instant-page-transition bg-[#060608] text-zinc-100">
                  {children}
                </main>

                {/* Global Bottom Floating Navigation Bar */}
                <GlobalNavigation />
              </div>
            </ToastProvider>
          </AnimationProvider>
        </UserProvider>
      </body>
    </html>
  );
}
