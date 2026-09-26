import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeBootstrap from "./theme-bootstrap";
import ContentProtection from "./content-protection";
import SessionGuard from "./session-guard";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "SpeakFlow IA — Fluência guiada por IA",
  description:
    "SpeakFlow — o poder da IA guiando sua fluência em inglês.",
  manifest: "/manifest.webmanifest",
  applicationName: "SpeakFlow IA",
  appleWebApp: {
    capable: true,
    title: "SpeakFlow",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07090d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body><ThemeBootstrap /><SessionGuard /><ContentProtection /><PwaRegister />{children}</body>
    </html>
  );
}
