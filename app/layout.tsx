import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lakeview Pilot",
  description: "Airbnb calendar sync",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
