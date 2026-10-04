import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ご依頼・予約",

  description:
    "WRAYMIXへの歌ってみたMIX依頼・予約ページです。プランと初稿希望日を選んで、空き状況を確認しながらご予約いただけます。",

  alternates: {
    canonical: "/booking",
  },

  openGraph: {
    url: "/booking",
    title: "歌ってみたMIXのご依頼・予約 | WRAYMIX",
    description:
      "プランと初稿希望日を選んで、空き状況を確認しながらご予約いただけます。",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function BookingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
