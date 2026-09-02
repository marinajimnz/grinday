import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Inter } from "next/font/google";
import Script from "next/script";
import { PencilIconDefs } from "@/components/icons/pencil-icons";
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

// The <html lang> the server renders is a static "es" (see the comment on
// RootLayout below) — this corrects it from the locale cookie before paint,
// same trick as the theme script above.
const LANG_INIT_SCRIPT = `
(function () {
  var m = document.cookie.match(/(?:^|; )grindaily-locale=(es|en)/);
  if (m) document.documentElement.lang = m[1];
})();
`;

// Deliberately locale-agnostic: this layout wraps EVERY route, including
// /offline, which has to stay statically prerenderable for the Service
// Worker's precache (see next/sw.ts). Reading cookies() here — even just to
// resolve the language — would force the whole app dynamic and silently
// break that. Locale resolution instead happens per route group, in
// (app)/layout.tsx and (auth)/layout.tsx, which don't have that constraint.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: LANG_INIT_SCRIPT intentionally overwrites
    // `lang` before hydration to match the locale cookie — unlike
    // data-theme (an attribute React never renders itself), `lang` is a
    // JSX prop React actively diffs, so without this it flags every
    // English session as a hydration mismatch.
    <html lang="es" suppressHydrationWarning>
      <body className={`${bagelFatOne.variable} ${inter.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <Script id="lang-init" strategy="beforeInteractive">
          {LANG_INIT_SCRIPT}
        </Script>
        <PencilIconDefs />
        {children}
      </body>
    </html>
  );
}
