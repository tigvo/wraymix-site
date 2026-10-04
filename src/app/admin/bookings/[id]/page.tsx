import Link from "next/link";

import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { createClientBookingPath } from "@/lib/clientBookingAccess";

import BookingAdminControls from "./BookingAdminControls";

import BookingCommunicationPanel from "./BookingCommunicationPanel";

type BookingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
    case "pending_review":
    case "awaiting_approval":
      return "内容確認中";

    case "reserved":
    case "confirmed":
    case "mixing":
      return "受付確定";

    case "first_draft":
      return "初稿提出済み";

    case "revision":
      return "修正対応中";

    case "delivered":
    case "completed":
      return "納品完了";

    case "cancelled":
      return "キャンセル";

    default:
      return status;
  }
}

function getServiceLabel(serviceType: string) {
  switch (serviceType) {
    case "full":
      return "フルコーラス";

    case "short":
      return "short";

    default:
      return serviceType;
  }
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

  return `${date.getMonth() + 1}月${date.getDate()}日 (${weekday})`;
}

function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function BookingDetailPage({
  params,
}: BookingDetailPageProps) {
  const { id: idString } = await params;

  const id = Number(idString);

  if (!Number.isInteger(id)) {
    notFound();
  }

  const [booking, allocations] = await Promise.all([
    prisma.booking.findUnique({
      where: {
        id,
      },
    }),

    prisma.workAllocation.findMany({
      where: {
        bookingId: id,
      },

      orderBy: {
        date: "asc",
      },
    }),
  ]);

  if (!booking) {
    notFound();
  }

  const materialLinks =
    booking.materialLinks
      ?.split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  /*
   * 顧客専用ページ
   */

  const clientProjectPath = createClientBookingPath(booking.id);

  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  const clientProjectUrl = `${siteUrl}${clientProjectPath}`;

  /*
   * 仕事用Gmail
   */

  const workGmailAddress = process.env.WORK_GMAIL_ADDRESS ?? "";

  return (
    <main className="min-h-screen bg-[#f7f1df] px-4 py-8 text-[#202020] md:px-8">
      <div className="mx-auto max-w-4xl">
        {/* =========================
            HEADER
        ========================= */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/bookings" className="text-sm font-black">
            ← BOOKINGS
          </Link>

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
        </div>

        <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.2em]">
              BOOKING #{booking.id}
            </p>

            <h1 className="mt-2 break-words text-4xl font-black md:text-5xl">
              {booking.songTitle}
            </h1>

            <p className="mt-2 text-black/55">{booking.name}</p>
          </div>

          <span className="rounded-full border-2 border-black bg-[#f5d48d] px-4 py-2 text-sm font-black">
            {getStatusLabel(booking.status)}
          </span>
        </div>

        {/* =========================
            ADMIN CONTROL
        ========================= */}

        <BookingAdminControls
          bookingId={booking.id}
          initialStatus={booking.status}
          initialPlanLabel={booking.planLabel}
          initialQuotedPrice={booking.quotedPrice}
          initialCostPoint={booking.costPoint}
          initialDeliveryDate={booking.deliveryDate}
          initialAdminNote={booking.adminNote}
          clientProjectPath={clientProjectPath}
        />

        {/* =========================
            CONTACT / REPLY
        ========================= */}

        <BookingCommunicationPanel
          customerName={booking.name}
          contact={booking.contact}
          songTitle={booking.songTitle}
          serviceType={booking.serviceType}
          planLabel={booking.planLabel}
          quotedPrice={booking.quotedPrice}
          deliveryDate={booking.deliveryDate}
          clientProjectUrl={clientProjectUrl}
          workGmailAddress={workGmailAddress}
          paymentMethod={booking.paymentMethod}
        />

        {/* =========================
            REQUEST
        ========================= */}

        <section className="mt-6 rounded-3xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_#202020]">
          <p className="text-xs font-black tracking-[0.18em]">REQUEST</p>

          <h2 className="mt-1 text-2xl font-black">ご依頼情報</h2>

          <div className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-black/40">お名前</p>

              <p className="mt-1 font-black">{booking.name}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">ご連絡先</p>

              <p className="mt-1 break-all font-black">{booking.contact}</p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">コース</p>

              <p className="mt-1 font-black">
                {booking.planLabel || getServiceLabel(booking.serviceType)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">歌唱人数</p>

              <p className="mt-1 font-black">{booking.singerCount}人</p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">
                コーラス・ハモリ提出
              </p>

              <p className="mt-1 font-black">{booking.chorusCount ?? 0}本</p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">初稿お渡し予定</p>

              <p className="mt-1 font-black">
                {formatDate(booking.deliveryDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">確定料金</p>

              <p className="mt-1 font-black">
                {booking.quotedPrice != null
                  ? formatYen(booking.quotedPrice)
                  : "未確定"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">作業量</p>

              <p className="mt-1 font-black">
                {booking.costPoint}
                pt
              </p>
            </div>
          </div>

          {booking.requestNote && (
            <div className="mt-6 border-t-2 border-black/10 pt-5">
              <p className="text-xs font-bold text-black/40">備考・ご希望</p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {booking.requestNote}
              </p>
            </div>
          )}
        </section>

        {/* =========================
            MATERIALS
        ========================= */}

        <section className="mt-6 rounded-3xl border-2 border-black bg-[#dcd4f5] p-6 shadow-[5px_5px_0_#202020]">
          <p className="text-xs font-black tracking-[0.18em]">MATERIALS</p>

          <h2 className="mt-1 text-2xl font-black">提出素材</h2>

          {materialLinks.length > 0 ? (
            <div className="mt-5 space-y-3">
              {materialLinks.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="flex items-center justify-between gap-4 rounded-xl border-2 border-black bg-white px-4 py-3 transition hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <p className="font-black">素材 {index + 1}</p>

                    <p className="mt-0.5 truncate text-xs text-black/45">
                      {url}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-black">OPEN ↗</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-white/50 p-4 text-sm text-black/50">
              素材はまだ提出されていません。
            </div>
          )}
        </section>

        {/* =========================
            WORK SCHEDULE
        ========================= */}

        <section className="mt-6 rounded-3xl border-2 border-black bg-[#bfe3d1] p-6 shadow-[5px_5px_0_#202020]">
          <p className="text-xs font-black tracking-[0.18em]">WORK SCHEDULE</p>

          <h2 className="mt-1 text-2xl font-black">作業割当</h2>

          {allocations.length > 0 ? (
            <div className="mt-5 space-y-2">
              {allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="flex items-center justify-between rounded-xl bg-white/65 px-4 py-3"
                >
                  <span className="font-black">
                    {formatDate(allocation.date)}
                  </span>

                  <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">
                    {allocation.points}
                    pt
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-black/50">作業割当はありません。</p>
          )}
        </section>

        {/* =========================
            ADMIN NOTE VIEW
        ========================= */}

        {booking.adminNote && (
          <section className="mt-6 rounded-3xl border-2 border-black bg-[#f5d48d] p-6">
            <p className="text-xs font-black tracking-[0.18em]">ADMIN NOTE</p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {booking.adminNote}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
