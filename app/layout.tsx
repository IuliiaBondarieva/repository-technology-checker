import type { Metadata } from "next";
import "../src/globals.css";

export const metadata: Metadata = {
  title: "Tech Stack Checker",
  description: "Analyze GitHub repositories for technology compliance",
  icons: {
    icon: [
      { url: "/icon-light-mode.svg", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-mode.svg", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
