import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wraymix.jp"),

  title: {
    default: "WRAYMIX | 歌ってみたMIXのご依頼・予約",
    template: "%s | WRAYMIX",
  },

  description:
    "歌ってみたのボーカルMIX依頼を受け付けています。フルコーラス・ワンコーラス・short対応。空き状況を確認してそのままご予約いただけます。",

  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "WRAYMIX",
    title: "WRAYMIX | 歌ってみたMIXのご依頼・予約",
    description:
      "歌ってみたのボーカルMIX依頼を受け付けています。空き状況を確認してそのままご予約いただけます。",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "WRAYMIX | 歌ってみたMIXのご依頼・予約",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "WRAYMIX | 歌ってみたMIXのご依頼・予約",
    description:
      "歌ってみたのボーカルMIX依頼を受け付けています。空き状況を確認してそのままご予約いただけます。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
