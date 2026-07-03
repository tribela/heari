import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "헤아리",
  description: "초성으로 단어를 헤아리기",
  metadataBase: new URL("https://heari.11ax.net/"),
  openGraph: {
    title: "헤아리",
    description: "초성으로 단어를 헤아리기",
    type: "website",
    url: "https://heari.11ax.net/",
    siteName: "헤아리",
    locale: "ko_KR",
  },
  twitter: null,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
