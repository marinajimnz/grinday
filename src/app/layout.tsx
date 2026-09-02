import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Inter } from "next/font/google";
import Script from "next/script";
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
  title: "Grindaily",
  description:
    "Vuelve a preparar un café como te gustó la última vez, sin depender de la memoria.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f2e6" },
    { media: "(prefers-color-scheme: dark)", color: "#10152c" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Runs before hydration so the stored theme (light/dark override, or
// nothing for "sigue al sistema") applies before first paint — otherwise
// the page would flash the system-default theme for a frame.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("grinday:theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${bagelFatOne.variable} ${inter.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
