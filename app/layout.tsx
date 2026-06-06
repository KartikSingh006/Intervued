import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentAI | Proctored Interview Platform",
  description: "Mission-critical recruitment and automated anti-cheat platform powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
