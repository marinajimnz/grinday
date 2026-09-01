import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Inter } from "next/font/google";
import "./globals.css";

const bagelFatOne = Bagel_Fat_One({
  variable: "--font-bagel-fat-one",
  weight: "400",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coffee Journal",
  description:
    "Vuelve a preparar un café como te gustó la última vez, sin depender de la memoria.",
};

export const viewport: Viewport = {
  themeColor: "#1b2a6e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${bagelFatOne.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
