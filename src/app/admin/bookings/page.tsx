import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getServiceLabel } from "@/lib/booking";

function statusLabel(status: string) {
  switch (status) {
    // 旧データ互換
    case "pending":
    case "pending_review":
    case "awaiting_approval":
      return "内容確認中";

    case "confirmed":
    case "reserved":
    case "mixing":
      return "受付確定";

    case "first_draft":
      return "初稿提出済み";

    case "revision":
      return "修正対応中";

    case "completed":
    case "delivered":
      return "納品完了";

    case "cancelled":
      return "キャンセル";

    default:
      return status;
  }
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

  return `${date.getMonth() + 1}月${date.getDate()}日 (${weekday})`;
}

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-[#f7f1df] px-4 py-8 text-[#202020] md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.2em]">WRAYMIX ADMIN</p>

            <h1 className="mt-1 text-4xl font-black md:text-6xl">BOOKINGS</h1>

            <p className="mt-2 text-sm text-black/55">ご依頼一覧</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/schedule"
              className="rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black"
            >
              SCHEDULE
            </Link>

            <Link
              href="/admin/portfolio"
              className="rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black"
            >
              PORTFOLIO
            </Link>
          </div>
        </header>

        <div className="mt-8 space-y-3">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/admin/bookings/${booking.id}`}
              className="block rounded-2xl border-2 border-black bg-white p-5 shadow-[3px_3px_0_#202020] transition hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-widest text-black/45">
                    #{booking.id}
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    {booking.songTitle}
                  </h2>

                  <p className="mt-1 text-sm">{booking.name}</p>
                </div>

                <div className="text-right">
                  <span className="rounded-full border border-black bg-[#bfe3d1] px-3 py-1 text-xs font-black">
                    {statusLabel(booking.status)}
                  </span>

                  <p className="mt-2 text-sm font-black">
                    初稿 {formatDate(booking.deliveryDate)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[#dcd4f5] px-3 py-1 font-bold">
                  {booking.planLabel || getServiceLabel(booking.serviceType)}
                </span>

                <span className="rounded-full bg-[#f5d48d] px-3 py-1 font-bold">
                  {booking.singerCount}人
                </span>

                {booking.materialLinks && (
                  <span className="rounded-full bg-[#f6cbd3] px-3 py-1 font-bold">
                    素材あり
                  </span>
                )}
              </div>
            </Link>
          ))}

          {bookings.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-black/25 p-10 text-center text-black/45">
              まだ依頼がありません。
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
