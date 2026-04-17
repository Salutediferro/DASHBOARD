import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { Analytics } from "@/components/legal/analytics";
import { EnvironmentBanner } from "@/components/legal/environment-banner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Salute di Ferro",
  description: "Coaching, allenamento e nutrizione — Salute di Ferro",
  applicationName: "Salute di Ferro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Salute di Ferro",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <EnvironmentBanner />
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-right" />
          <PwaRegister />
          <CookieBanner />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
