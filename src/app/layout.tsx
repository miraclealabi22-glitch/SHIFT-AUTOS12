import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHIFT — Automotive, Reconsidered",
  description: "Discover. Experience. Share. A new perspective on automobiles and the culture around them.",
  applicationName: "SHIFT",
  icons: {
    icon: "/shift-emblem.png",
    shortcut: "/shift-emblem.png",
    apple: "/shift-emblem.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
