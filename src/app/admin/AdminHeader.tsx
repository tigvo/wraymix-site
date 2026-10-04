"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
    href: "/admin/bookings",
    label: "BOOKINGS",
  },
  {
    href: "/admin/schedule",
    label: "SCHEDULE",
  },
  {
    href: "/admin/portfolio",
    label: "PORTFOLIO",
  },
];

export default function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-2 border-black bg-[#202020] px-4 py-3 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link href="/admin/bookings" className="font-black tracking-[0.16em]">
          WRAYMIX ADMIN
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full border-2 px-4 py-2 text-xs font-black transition ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/40 bg-transparent text-white hover:border-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border-2 border-white/40 px-4 py-2 text-xs font-black text-white transition hover:border-white"
          >
            SITE ↗
          </Link>
        </nav>
      </div>
    </header>
  );
}
