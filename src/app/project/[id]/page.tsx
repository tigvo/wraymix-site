import Link from "next/link";

import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { verifyClientBookingToken } from "@/lib/clientBookingAccess";

import { getServiceLabel } from "@/lib/booking";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    token?: string | string[];
  }>;
};

const progressSteps = [
  {
    status: "pending_review",
    label: "内容確認",
  },
  {
    status: "reserved",
    label: "受付確定",
  },
  {
    status: "first_draft",
    label: "初稿",
  },
  {
    status: "revision",
    label: "修正",
  },
  {
    status: "delivered",
    label: "納品",
  },
];

function normalizeStatus(status: string) {
  switch (status) {
    // 旧ステータス互換
    case "pending":
    case "awaiting_approval":
      return "pending_review";

    case "confirmed":
    case "mixing":
      return "reserved";

    case "completed":
      return "delivered";

    default:
      return status;
  }
}

function getStatusLabel(status: string) {
  const normalizedStatus = normalizeStatus(status);

  switch (normalizedStatus) {
    case "pending_review":
      return "内容確認中";

    case "reserved":
      return "受付確定";

    case "first_draft":
      return "初稿提出済み";

    case "revision":
      return "修正対応中";

    case "delivered":
      return "納品完了";

    case "cancelled":
      return "キャンセル";

    default:
      return status;
  }
}

function getStatusDescription(status: string) {
  const normalizedStatus = normalizeStatus(status);

  switch (normalizedStatus) {
    case "pending_review":
      return "ご依頼内容を確認しています。内容・料金を確認後、ご連絡します。";

    case "reserved":
      return "受付が完了しました。初稿のお渡しまでお待ちください！";

    case "first_draft":
      return "初稿をお送りしています。内容をご確認ください。";

    case "revision":
      return "いただいた内容をもとに修正対応を進めています。";

    case "delivered":
      return "最終音源を納品済みです。ご依頼ありがとうございました！";

    case "cancelled":
      return "このご依頼はキャンセルされています。";

    default:
      return "";
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

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { id: idString } = await params;

  const query = await searchParams;

  const id = Number(idString);

  const token = typeof query.token === "string" ? query.token : "";

  if (!Number.isInteger(id) || !token || !verifyClientBookingToken(id, token)) {
    notFound();
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id,
    },
  });

  if (!booking) {
    notFound();
  }

  const materialLinks =
    booking.materialLinks
      ?.split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  const normalizedStatus = normalizeStatus(booking.status);

  const currentStep = progressSteps.findIndex(
    (step) => step.status === normalizedStatus,
  );

  return (
    <main className="min-h-screen bg-[#f7f1df] px-4 py-8 text-[#202020] md:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm font-black">
          ← WRAYMIX
        </Link>

        <div className="mt-8">
          <p className="text-xs font-black tracking-[0.2em]">YOUR PROJECT</p>

          <h1 className="mt-1 break-words text-4xl font-black md:text-6xl">
            {booking.songTitle}
          </h1>

          <p className="mt-3 text-sm text-black/50">BOOKING #{booking.id}</p>
        </div>

        {/* =========================
            STATUS
        ========================= */}

        <section className="mt-8 rounded-3xl border-2 border-black bg-[#bfe3d1] p-6 shadow-[6px_6px_0_#202020]">
          <p className="text-xs font-black tracking-[0.18em]">CURRENT STATUS</p>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-black">
              {getStatusLabel(booking.status)}
            </h2>

            {normalizedStatus !== "cancelled" && (
              <span className="rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black">
                初稿予定 {formatDate(booking.deliveryDate)}
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-black/60">
            {getStatusDescription(booking.status)}
          </p>

          {normalizedStatus === "cancelled" ? (
            <div className="mt-6 rounded-2xl border-2 border-black bg-[#f6cbd3] p-4 font-bold">
              このご依頼はキャンセルされています。
            </div>
          ) : (
            <div className="mt-7 grid grid-cols-3 gap-2 md:grid-cols-5">
              {progressSteps.map((step, index) => {
                const completed = currentStep >= 0 && index <= currentStep;

                return (
                  <div key={step.status}>
                    <div
                      className={`h-2 rounded-full border border-black ${
                        completed ? "bg-black" : "bg-white/50"
                      }`}
                    />

                    <p
                      className={`mt-2 text-[10px] font-black md:text-xs ${
                        completed ? "" : "text-black/35"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================
            DETAILS
        ========================= */}

        <section className="mt-6 rounded-3xl border-2 border-black bg-white p-6 shadow-[5px_5px_0_#202020]">
          <p className="text-xs font-black tracking-[0.18em]">DETAILS</p>

          <h2 className="mt-1 text-2xl font-black">ご依頼内容</h2>

          <div className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-black/40">プラン</p>

              <p className="mt-1 text-lg font-black">
                {booking.planLabel || getServiceLabel(booking.serviceType)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">料金</p>

              <p className="mt-1 text-lg font-black">
                {booking.quotedPrice != null
                  ? formatYen(booking.quotedPrice)
                  : "内容確認後に確定"}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">歌唱人数</p>

              <p className="mt-1 font-black">{booking.singerCount}人</p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">初稿お渡し予定</p>

              <p className="mt-1 font-black">
                {formatDate(booking.deliveryDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-black/40">
                コーラス・ハモリ提出
              </p>

              <p className="mt-1 font-black">{booking.chorusCount ?? 0}本</p>
            </div>

            {booking.isExpress && (
              <div>
                <p className="text-xs font-bold text-black/40">お急ぎ対応</p>

                <p className="mt-1 font-black">⚡ お急ぎ</p>
              </div>
            )}
          </div>

          {booking.requestNote && (
            <div className="mt-6 border-t-2 border-black/10 pt-5">
              <p className="text-xs font-bold text-black/40">ご希望・備考</p>

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
            NOTICE
        ========================= */}

        <div className="mt-8 rounded-2xl border-2 border-black/15 p-5 text-xs leading-5 text-black/50">
          このページはご依頼専用ページです。
          URLを知っている方のみ閲覧できますので、第三者への共有はお控えください。
        </div>
      </div>
    </main>
  );
}
