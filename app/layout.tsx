import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import PwaRegistration from "@/components/PwaRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lakeview",
  description: "Property service operations for short-term rental owners and providers.",
  manifest: "/manifest.webmanifest",
  applicationName: "Lakeview",
  appleWebApp: {
    capable: true,
    title: "Lakeview",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f2742",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>{children}</ClerkProvider>
        <PwaRegistration />
      </body>
    </html>
  );
}
