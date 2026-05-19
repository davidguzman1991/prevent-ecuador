import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PREVENT Ecuador",
  description: "Base frontend para la plataforma PREVENT Ecuador",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
