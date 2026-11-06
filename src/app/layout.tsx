import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Smart Fitness", template: "%s · Smart Fitness" },
  description: "Tus datos de Garmin, explicados.",
  applicationName: "Smart Fitness",
  appleWebApp: { capable: true, title: "Smart Fitness", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f3" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1412" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The init script sets data-theme before React hydrates.
    <html lang="es" suppressHydrationWarning className={`${manrope.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
