import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { ColorSchemeScript } from "@mantine/core";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "Hesego Ingeniería - TerraFormars",
  description: "Plataforma de infraestructura inteligente con IA para Hesego Ingeniería",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="icon" href="/logo.png" />
      </head>
      <body className={`${inter.variable} ${outfit.variable}`} style={{ fontFamily: 'var(--font-inter)' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
