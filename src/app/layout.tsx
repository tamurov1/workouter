import type { Metadata } from "next";
import { Sora, Space_Mono } from "next/font/google";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workouter",
  description: "Workout management app for trainees and trainers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                const key = "workouter-theme";
                const stored = window.localStorage.getItem(key);
                const preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
                const theme = stored === "light" || stored === "dark" ? stored : preferred;
                document.documentElement.dataset.theme = theme;
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${sora.variable} ${spaceMono.variable} antialiased`}
      >
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
