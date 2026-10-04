import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-black bg-[#202020] text-[#f7f1df]">
      <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-2xl font-black">WRAYMIX</p>

            <p className="mt-1 text-xs font-bold tracking-[0.18em] text-white/55">
              VOCAL MIX FOR SINGER
            </p>
          </div>

          <nav className="flex flex-wrap gap-3 text-sm font-black">
            <Link
              href="/#works"
              className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white hover:text-black"
            >
              WORKS
            </Link>

            <Link
              href="/#price"
              className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white hover:text-black"
            >
              PRICE
            </Link>

            <Link
              href="/#order"
              className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white hover:text-black"
            >
              ORDER
            </Link>

            <Link
              href="/booking"
              className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white hover:text-black"
            >
              BOOKING
            </Link>
          </nav>
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-white/75">
          <p>
            通常のご依頼は{" "}
            <Link href="/booking" className="font-black underline">
              依頼ページ
            </Link>{" "}
            からお願いします。
          </p>

          <p className="mt-2">
            ご不明な点がある場合のみ、
            <a
              href="https://x.com/wray_mid"
              target="_blank"
              rel="noopener noreferrer"
              className="font-black underline"
            >
              X
            </a>
            {" / "}
            <a href="mailto:wraymid@gmail.com" className="font-black underline">
              メール
            </a>
            へお気軽にご連絡ください。
          </p>

          <p className="mt-2 text-white/55">
            録音前の枠押さえも可能です。内容確認後に最終料金をご案内します。
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 text-xs text-white/45 md:flex-row md:items-center md:justify-between">
          <p>© 2026 WRAYMIX</p>

          <p>Mix request site for singers</p>
        </div>
      </div>
    </footer>
  );
}
