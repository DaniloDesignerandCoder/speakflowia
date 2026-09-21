import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeakFlow IA — Fluência guiada por IA",
  description:
    "SpeakFlow — o poder da IA guiando sua fluência em inglês.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
