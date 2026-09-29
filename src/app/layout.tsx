import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import { PageLoadingProvider } from "@/components/ui/PageLoadingOverlay";
import "./globals.css";

export const metadata: Metadata = {
  title: "پورتال سازمانی زیلبر | Zilber Portal",
  description: "سامانه یکپارچه خدمات کارکنان و ثبت حضور و غیاب شرکت زیلبر",
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
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <StyledComponentsRegistry>
          <PageLoadingProvider>{children}</PageLoadingProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
