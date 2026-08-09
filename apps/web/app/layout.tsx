import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "@workspace/ui/globals.css";
import "@cubing/icons";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.cubingmexico.net"),
  title: "Cubing México",
  description:
    "Cubing México es un sitio web que recopila rankings y récords estatales mexicanos basado en los resultados de la WCA.",
  openGraph: {
    title: "Cubing México",
    description:
      "Cubing México es un sitio web que recopila rankings y récords estatales mexicanos basado en los resultados de la WCA.",
    url: "https://www.cubingmexico.net",
    siteName: "Cubing México",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cubing México",
    description:
      "Cubing México es un sitio web que recopila rankings y récords estatales mexicanos basado en los resultados de la WCA.",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const fontDisplay = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} font-sans antialiased `}
      >
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
        <Toaster />
      </body>
    </html>
  );
}
