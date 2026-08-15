import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AOFMOKA — Wear the Impossible",
  description: "Explore AOFMOKA UV-reactive wearable art and purchase the exact design securely on Amazon.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "AOFMOKA — Wear the Impossible",
    description: "UV-reactive wearable art. Explore the collection and shop the exact design on Amazon.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
