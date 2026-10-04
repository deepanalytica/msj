import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MSJ — Omnichannel AI",
  description: "Inbox y agente omnicanal independiente para WhatsApp, Instagram y Messenger."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
