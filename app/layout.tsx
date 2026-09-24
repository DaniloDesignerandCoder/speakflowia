import type { Metadata } from "next";
import "./globals.css";
import ThemeBootstrap from "./theme-bootstrap";
import ContentProtection from "./content-protection";
import SessionGuard from "./session-guard";

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
      <body><ThemeBootstrap /><SessionGuard /><ContentProtection />{children}</body>
    </html>
  );
}
