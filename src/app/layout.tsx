import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PakGold POS",
  description: "Offline-first Gold & Jewellery POS for Pakistani Sarafa businesses",
  manifest: "/manifest.webmanifest",
  applicationName: "PakGold POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PakGold POS",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${nastaliq.variable} font-sans`}>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
