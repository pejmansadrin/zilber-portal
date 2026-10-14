import type { Metadata, Viewport } from "next";
import PwaShell from "@/components/pwa/PwaShell";
import { pwaBootstrap } from "@/lib/pwa-bootstrap";
import { PageLoadingProvider } from "@/components/ui/PageLoadingOverlay";
import "./globals.css";

export const metadata: Metadata = {
  title: "پورتال سازمانی زیلبر | Zilber Portal",
  description: "سامانه یکپارچه خدمات کارکنان و ثبت حضور و غیاب شرکت زیلبر",
  applicationName: "زیلبر",
  appleWebApp: { capable: true, title: "زیلبر", statusBarStyle: "black-translucent" },
  icons: { apple: "/pwa/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#16214f",
};


const themeScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem('theme');
    var isDark = storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
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
    <html
      lang="fa"
      dir="rtl"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: pwaBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <PwaShell><PageLoadingProvider>{children}</PageLoadingProvider></PwaShell>
      </body>
    </html>
  );
}
