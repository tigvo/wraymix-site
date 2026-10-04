"use client";

import Link from "next/link";

import { useEffect, useMemo, useRef, useState } from "react";

import { getBasePrice, getServiceLabel, type ServiceType } from "@/lib/booking";

import SiteFooter from "@/components/SiteFooter";

type AvailabilityDay = {
  date: string;

  status: "available" | "few" | "full";

  isExpress: boolean;

  estimatedPrice: number | null;
};

// type PaymentMethod = "bank_transfer" | "credit_card";

// function getPaymentMethodLabel(method: PaymentMethod) {
//   switch (method) {
//     case "bank_transfer":
//       return "銀行振込";

//     case "credit_card":
//       return "クレジットカード";
//   }
// }

function normalizeNumberInput(value: string) {
  // 全角数字 → 半角数字
  const halfWidth = value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );

  // 「本」「人」など数字以外を除去
  return halfWidth.replace(/[^0-9]/g, "");
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatLongDate(dateString: string) {
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

function getMonthDateStrings(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from(
    {
      length: lastDay,
    },
    (_, index) => {
      const day = index + 1;

      return [
        year,
        String(month + 1).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    },
  );
}

async function fetchAvailability(service: ServiceType, singers: number) {
  const params = new URLSearchParams({
    service,
    singers: String(singers),
  });

  const response = await fetch(`/api/availability?${params.toString()}`);

  if (!response.ok) {
    throw new Error("空き状況の取得に失敗しました");
  }

  return response.json();
}

export default function BookingPage() {
  const [service, setService] = useState<ServiceType>("full");

  const [singerMode, setSingerMode] = useState<"preset" | "custom">("preset");

  const [presetSingers, setPresetSingers] = useState(1);

  const [customSingerInput, setCustomSingerInput] = useState("4");

  const [chorusInput, setChorusInput] = useState("0");

  const singers =
    service === "short"
      ? 1
      : singerMode === "custom"
        ? Math.max(4, Number(customSingerInput) || 4)
        : presetSingers;

  const availabilityKey = `${service}:${singers}`;

  const chorusCount = Number(chorusInput) || 0;

  const [schedule, setSchedule] = useState<AvailabilityDay[]>([]);

  const [loadedAvailabilityKey, setLoadedAvailabilityKey] = useState<
    string | null
  >(null);

  const [earliestDate, setEarliestDate] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [name, setName] = useState("");

  const [contact, setContact] = useState("");

  const [songTitle, setSongTitle] = useState("");

  const [materialLinks, setMaterialLinks] = useState("");

  const [requestNote, setRequestNote] = useState("");

  // const [paymentMethod, setPaymentMethod] =
  //   useState<PaymentMethod>("bank_transfer");

  const [clientProjectPath, setClientProjectPath] = useState<string | null>(
    null,
  );

  const [isConfirming, setIsConfirming] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();

  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());

  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetchAvailability(service, singers)
      .then((data) => {
        if (cancelled) {
          return;
        }

        setSchedule(data.availability ?? []);

        setEarliestDate(data.earliestAvailableDate ?? null);

        // この service / singers の空き状況を取得完了
        setLoadedAvailabilityKey(`${service}:${singers}`);

        const earliest = data.earliestAvailableDate;

        // 最短受付可能日の月を最初に表示
        if (earliest) {
          const date = new Date(`${earliest}T00:00:00`);

          setCalendarYear(date.getFullYear());

          setCalendarMonth(date.getMonth());
        }
      })
      .catch((error) => {
        console.error("空き状況取得エラー:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [service, singers]);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    confirmRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isConfirming]);

  const availabilityMap = useMemo(
    () => new Map(schedule.map((day) => [day.date, day])),
    [schedule],
  );

  const monthDates = useMemo(
    () => getMonthDateStrings(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();

  const selectedDay = selectedDate
    ? availabilityMap.get(selectedDate)
    : undefined;

  const basePrice = getBasePrice(service);

  function previousMonth() {
    if (calendarMonth === 0) {
      setCalendarYear((year) => year - 1);

      setCalendarMonth(11);
    } else {
      setCalendarMonth((month) => month - 1);
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarYear((year) => year + 1);

      setCalendarMonth(0);
    } else {
      setCalendarMonth((month) => month + 1);
    }
  }

  if (isCompleted) {
    return (
      <>
        <main className="min-h-screen bg-[#f7f1df] p-6 text-[#202020]">
          <div className="mx-auto max-w-2xl">
            <section className="rounded-3xl border-2 border-black bg-[#bfe3d1] p-8 shadow-[6px_6px_0_#202020]">
              <p className="text-xs font-black tracking-[0.2em]">
                REQUEST RECEIVED
              </p>

              <h1 className="mt-2 text-3xl font-black">
                ご依頼を受け付けました！
              </h1>

              <div className="mt-6 rounded-2xl bg-white/70 p-5">
                <p className="text-sm font-bold">CURRENT STATUS</p>

                <p className="mt-1 text-xl font-black">内容確認待ち</p>

                <p className="mt-3 text-sm leading-6">
                  内容・尺・コーラス等を確認後、
                  最終料金と受付内容をご連絡します。
                </p>
              </div>

              {clientProjectPath && (
                <div className="mt-6 rounded-2xl border-2 border-black bg-[#dcd4f5] p-5">
                  <p className="text-xs font-black tracking-[0.18em]">
                    PROJECT PAGE
                  </p>

                  <p className="mt-2 font-black">ご依頼専用ページ</p>

                  <p className="mt-2 text-sm leading-6 text-black/60">
                    進行状況・料金・初稿予定日は、
                    このページからいつでも確認できます。
                  </p>

                  <Link
                    href={clientProjectPath}
                    className="mt-4 inline-block rounded-xl border-2 border-black bg-black px-5 py-3 font-black text-white"
                  >
                    案件ページを開く →
                  </Link>
                </div>
              )}

              <div className="mt-6 space-y-2">
                <p>
                  <strong>曲名：</strong>
                  {songTitle}
                </p>

                <p>
                  <strong>初稿お渡し希望日：</strong>
                  {selectedDate ? formatLongDate(selectedDate) : ""}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-black/60">
                初稿お渡し後、ご確認いただいたうえで修正対応を行います。
                最終納品日は修正内容・回数によって異なります。
              </p>

              <Link
                href="/"
                className="mt-8 inline-block rounded-xl border-2 border-black bg-white px-6 py-3 font-black"
              >
                TOPへ戻る
              </Link>
            </section>
          </div>
        </main>

        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f7f1df] px-4 py-8 text-[#202020]">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="text-sm font-black">
            ← WRAYMIX
          </Link>

          <p className="mt-8 text-xs font-black tracking-[0.2em]">REQUEST</p>

          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            BOOKING
          </h1>

          <p className="mt-3 text-sm font-bold leading-6 text-black/60">
            ご依頼はこのフォームから受け付けています。
            ご不明点がある場合は、XのDMまたはメールからお気軽にご相談ください。
          </p>

          {earliestDate && (
            <div className="mt-7 rounded-2xl border-2 border-black bg-[#bfe3d1] p-5 shadow-[4px_4px_0_#202020]">
              <p className="text-xs font-black tracking-widest">NEXT SLOT</p>

              <p className="mt-1 text-2xl font-black">
                最短 {formatDate(earliestDate)}
                初稿お渡し
              </p>
            </div>
          )}

          {/* =========================
            PLAN
        ========================= */}

          <section className="mt-8 rounded-3xl border-2 border-black bg-[#dcd4f5] p-6 shadow-[6px_6px_0_#202020]">
            <p className="text-xs font-black tracking-widest">PLAN</p>

            <h2 className="mt-1 text-2xl font-black">ご依頼内容</h2>

            <div className="mt-6">
              <p className="font-bold">ご希望プラン</p>

              <select
                value={service}
                onChange={(event) => {
                  setService(event.target.value as ServiceType);

                  setSelectedDate(null);

                  setIsConfirming(false);

                  setLoadedAvailabilityKey(null);
                }}
                className="mt-2 w-full rounded-xl border-2 border-black bg-white p-3"
              >
                <option value="full">フルコーラス</option>

                <option value="one_chorus">ワンコーラス</option>

                <option value="short">short</option>
              </select>
            </div>

            {service !== "short" && (
              <div className="mt-6">
                <p className="font-bold">歌唱人数</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[1, 2, 3].map((number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() => {
                        setSingerMode("preset");

                        setPresetSingers(number);

                        setSelectedDate(null);

                        setIsConfirming(false);

                        setLoadedAvailabilityKey(null);
                      }}
                      className={`rounded-xl border-2 border-black px-5 py-2 font-black ${
                        singerMode === "preset" && presetSingers === number
                          ? "bg-black text-white"
                          : "bg-white"
                      }`}
                    >
                      {number}人
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      setSingerMode("custom");

                      setSelectedDate(null);

                      setIsConfirming(false);

                      setLoadedAvailabilityKey(null);
                    }}
                    className={`rounded-xl border-2 border-black px-5 py-2 font-black ${
                      singerMode === "custom"
                        ? "bg-black text-white"
                        : "bg-white"
                    }`}
                  >
                    4人以上
                  </button>
                </div>

                {singerMode === "custom" && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customSingerInput}
                      onChange={(event) => {
                        setCustomSingerInput(
                          normalizeNumberInput(event.target.value),
                        );

                        setSelectedDate(null);

                        setIsConfirming(false);

                        setLoadedAvailabilityKey(null);
                      }}
                      className="w-24 rounded-xl border-2 border-black bg-white p-3 text-center font-black"
                    />

                    <span className="font-bold">人</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 rounded-xl bg-white/60 p-4">
              <p className="text-sm">基本料金の目安</p>

              <p className="text-2xl font-black">
                {basePrice != null
                  ? `${formatYen(basePrice)}〜`
                  : "内容確認後にご案内"}
              </p>

              <p className="mt-2 text-xs leading-5 text-black/55">
                コーラス・ハモリなどの追加料金は含まれていません。
                提出内容を確認したうえで、正式な料金をご案内します。
              </p>
            </div>
          </section>

          {/* =========================
            DELIVERY CALENDAR
        ========================= */}

          <section className="mt-8 rounded-3xl border-2 border-black bg-[#f6cbd3] p-5 shadow-[6px_6px_0_#202020] md:p-6">
            <p className="text-xs font-black tracking-widest">DELIVERY</p>

            <h2 className="mt-1 text-2xl font-black">初稿お渡し希望日</h2>

            <p className="mt-2 text-sm leading-6 text-black/60">
              選択いただく日付は、MIXの初稿をお渡しする予定日です。
              修正対応・最終納品は初稿お渡し後となります。
            </p>

            <div className="mx-auto mt-6 max-w-xl">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={previousMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white font-black transition hover:-translate-y-0.5"
                >
                  ←
                </button>

                <p className="text-lg font-black">
                  {calendarYear}年 {calendarMonth + 1}月
                </p>

                <button
                  type="button"
                  onClick={nextMonth}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white font-black transition hover:-translate-y-0.5"
                >
                  →
                </button>
              </div>

              <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-black md:text-xs">
                <div className="text-[#c84f6a]">SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div className="text-[#5574b9]">SAT</div>
              </div>

              {loadedAvailabilityKey !== availabilityKey ? (
                <div className="mt-2 flex h-40 items-center justify-center rounded-2xl bg-white/30 text-sm font-bold text-black/40">
                  空き状況を読み込み中...
                </div>
              ) : (
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {Array.from({
                    length: firstWeekday,
                  }).map((_, index) => (
                    <div key={`blank-${index}`} className="h-16 md:h-[72px]" />
                  ))}

                  {monthDates.map((date) => {
                    const day = availabilityMap.get(date);

                    const selectable = Boolean(day && day.status !== "full");

                    const selected = selectedDate === date;

                    const dayStyle =
                      day?.status === "available"
                        ? "bg-[#e5f4ec]"
                        : day?.status === "few"
                          ? "bg-[#fae7b6]"
                          : day?.status === "full"
                            ? "bg-[#eadde1]"
                            : "bg-white/20";

                    return (
                      <button
                        key={date}
                        type="button"
                        disabled={!selectable}
                        onClick={() => {
                          setSelectedDate(date);

                          setIsConfirming(false);
                        }}
                        className={`relative h-16 overflow-hidden rounded-xl border-2 transition md:h-[72px] ${
                          selected
                            ? "border-black bg-black text-white shadow-[3px_3px_0_#202020]"
                            : day
                              ? `border-black ${dayStyle}`
                              : "border-black/10 bg-white/20 text-black/20"
                        } ${
                          selectable
                            ? "hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#202020]"
                            : "cursor-default"
                        }`}
                      >
                        <span className="absolute left-2 top-1.5 text-xs font-black leading-none md:text-sm">
                          {Number(date.slice(-2))}
                        </span>

                        {day?.isExpress && day.status !== "full" && (
                          <span
                            className="absolute right-2 top-1 text-sm"
                            title="お急ぎ納品"
                          >
                            ⚡
                          </span>
                        )}

                        {day?.status === "few" && (
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-black bg-[#f5d48d] px-2 py-0.5 text-[9px] font-black md:text-[10px]">
                            △ FEW
                          </span>
                        )}

                        {day?.status === "full" && (
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-black/50 bg-white/50 px-2 py-0.5 text-[9px] font-black md:text-[10px]">
                            × FULL
                          </span>
                        )}

                        {day?.status === "available" && (
                          <span className="absolute bottom-2 left-2 h-1.5 w-5 rounded-full bg-[#67af8b]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedDay?.isExpress && (
              <div className="mt-6 rounded-xl border-2 border-black bg-[#f5d48d] p-4">
                <p className="font-black">⚡ お急ぎ納品</p>

                <p className="mt-1 text-sm leading-6">
                  2日後までの初稿お渡しは、お急ぎ対応として通常料金の1.5倍となります。
                </p>

                <p className="mt-2 font-black">
                  {selectedDay.estimatedPrice != null
                    ? `基本料金目安 ${formatYen(selectedDay.estimatedPrice)}〜`
                    : "料金は内容確認後にご案内します"}
                </p>
              </div>
            )}
          </section>

          {/* =========================
            DETAILS
        ========================= */}

          {selectedDate && (
            <section className="mt-8 rounded-3xl border-2 border-black bg-[#faf7ef] p-6 shadow-[6px_6px_0_#202020]">
              <p className="text-xs font-black tracking-widest">DETAILS</p>

              <h2 className="mt-1 text-2xl font-black">ご依頼情報</h2>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                <div className="space-y-5">
                  <label className="block">
                    <span className="font-bold">お名前</span>

                    <input
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);

                        setIsConfirming(false);
                      }}
                      className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                    />
                  </label>

                  <label className="block">
                    <span className="font-bold">
                      XのID またはメールアドレス
                    </span>

                    <input
                      value={contact}
                      onChange={(event) => {
                        setContact(event.target.value);

                        setIsConfirming(false);
                      }}
                      placeholder="@example"
                      className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                    />
                  </label>
                </div>

                <div className="overflow-hidden rounded-2xl border-2 border-black bg-[#dcd4f5] shadow-[3px_3px_0_#202020]">
                  <div className="border-b-2 border-black bg-white/45 px-4 py-2">
                    <p className="text-[9px] font-black tracking-[0.18em]">
                      SELECTED DATE
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-2xl font-black leading-none">
                      {formatLongDate(selectedDate)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-black/60">
                        初稿お渡し予定
                      </span>
                    </div>

                    {selectedDay?.isExpress && (
                      <div className="mt-3">
                        <span className="inline-flex rounded-full border border-black bg-[#f5d48d] px-2.5 py-1 text-[10px] font-black">
                          ⚡ お急ぎ
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <label className="block">
                  <span className="font-bold">曲名</span>

                  <input
                    value={songTitle}
                    onChange={(event) => {
                      setSongTitle(event.target.value);

                      setIsConfirming(false);
                    }}
                    className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                  />
                </label>

                <label className="block">
                  <span className="font-bold">コーラス・ハモリ提出本数</span>

                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={chorusInput}
                      onChange={(event) => {
                        setChorusInput(
                          normalizeNumberInput(event.target.value),
                        );

                        setIsConfirming(false);
                      }}
                      placeholder="0"
                      className="w-28 rounded-xl border-2 border-black bg-[#fffdf8] p-3 text-center font-black"
                    />

                    <span className="font-bold">本</span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-black/50">
                    本数はお見積もり確認用です。この時点では料金に自動加算されません。
                  </p>
                </label>

                <label className="block">
                  <span className="font-bold">素材URL</span>

                  <textarea
                    value={materialLinks}
                    onChange={(event) => {
                      setMaterialLinks(event.target.value);

                      setIsConfirming(false);
                    }}
                    rows={3}
                    placeholder={`https://drive.google.com/...\nhttps://gigafile.nu/...`}
                    className="mt-2 w-full resize-y rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                  />

                  <p className="mt-2 text-xs leading-5 text-black/50">
                    Google
                    Drive・ギガファイル便など。複数ある場合は1行に1URL入力してください。
                    <br />
                    素材が未録音・未提出でもご予約いただけます。準備でき次第、Xまたはメールでお送りください。
                  </p>
                </label>

                {/* <div>
                <p className="font-bold">お支払い方法</p>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("bank_transfer");

                      setIsConfirming(false);
                    }}
                    className={`rounded-xl border-2 border-black p-4 text-left ${
                      paymentMethod === "bank_transfer"
                        ? "bg-black text-white"
                        : "bg-[#fffdf8]"
                    }`}
                  >
                    <p className="font-black">銀行振込</p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        paymentMethod === "bank_transfer"
                          ? "text-white/65"
                          : "text-black/50"
                      }`}
                    >
                      お支払い時に振込先をご案内します。
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod("credit_card");

                      setIsConfirming(false);
                    }}
                    className={`rounded-xl border-2 border-black p-4 text-left ${
                      paymentMethod === "credit_card"
                        ? "bg-black text-white"
                        : "bg-[#fffdf8]"
                    }`}
                  >
                    <p className="font-black">クレジットカード</p>

                    <p
                      className={`mt-1 text-xs leading-5 ${
                        paymentMethod === "credit_card"
                          ? "text-white/65"
                          : "text-black/50"
                      }`}
                    >
                      お支払い時に決済用リンクをご案内します。
                    </p>
                  </button>
                </div>

                <p className="mt-2 text-xs text-black/45">
                  お支払い方法による料金の変更はありません。
                </p>
              </div> */}

                <label className="block">
                  <span className="font-bold">備考・ご希望</span>

                  <textarea
                    value={requestNote}
                    onChange={(event) => {
                      setRequestNote(event.target.value);

                      setIsConfirming(false);
                    }}
                    rows={5}
                    placeholder="参考音源、MIXの雰囲気、特殊な構成など"
                    className="mt-2 w-full resize-y rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                  />
                </label>
              </div>

              <button
                type="button"
                disabled={!name || !contact || !songTitle}
                onClick={() => setIsConfirming(true)}
                className="mt-6 w-full rounded-xl border-2 border-black bg-black px-4 py-3 font-black text-white disabled:opacity-30"
              >
                内容を確認する
              </button>
            </section>
          )}

          {/* =========================
            CONFIRM
        ========================= */}

          {isConfirming && selectedDate && (
            <section
              ref={confirmRef}
              className="mt-8 rounded-3xl border-2 border-black bg-[#bfe3d1] p-6 shadow-[6px_6px_0_#202020]"
            >
              <p className="text-xs font-black tracking-widest">CONFIRM</p>

              <h2 className="mt-1 text-2xl font-black">ご依頼内容の確認</h2>

              <div className="mt-6 space-y-2 rounded-xl bg-white/70 p-5">
                <p>
                  <strong>お名前：</strong>
                  {name}
                </p>

                <p>
                  <strong>ご連絡先：</strong>
                  {contact}
                </p>

                <p>
                  <strong>曲名：</strong>
                  {songTitle}
                </p>

                <p>
                  <strong>コース：</strong>
                  {getServiceLabel(service)}
                </p>

                {service !== "short" && (
                  <p>
                    <strong>歌唱人数：</strong>
                    {singers}人
                  </p>
                )}

                <p>
                  <strong>コーラス・ハモリ：</strong>
                  {chorusCount}本
                </p>

                <p>
                  <strong>初稿お渡し希望日：</strong>
                  {formatLongDate(selectedDate)}
                </p>

                {materialLinks.trim() && (
                  <div className="pt-2">
                    <strong>素材URL：</strong>

                    <div className="mt-1 space-y-1">
                      {materialLinks
                        .split(/\r?\n/)
                        .map((value) => value.trim())
                        .filter(Boolean)
                        .map((value, index) => (
                          <p
                            key={`${value}-${index}`}
                            className="break-all text-sm"
                          >
                            {value}
                          </p>
                        ))}
                    </div>
                  </div>
                )}

                {selectedDay?.isExpress && (
                  <p className="font-black">⚡ お急ぎ納品</p>
                )}

                {requestNote && (
                  <div className="pt-2">
                    <strong>備考・ご希望：</strong>

                    <p className="mt-1 whitespace-pre-wrap">{requestNote}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-xl border-2 border-black bg-white p-4">
                <p className="font-black">
                  料金・プランは内容確認後に確定します
                </p>

                <p className="mt-2 text-sm leading-6 text-black/60">
                  基本料金に加え、コーラス・ハモリなどの追加料金が発生する場合があります。
                  正式なお見積もりは、ご依頼内容を確認後にご案内します。
                  <br />
                  選択いただいた日付は初稿のお渡し予定日です。
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirming(false)}
                  className="w-1/2 rounded-xl border-2 border-black bg-white px-4 py-3 font-black"
                >
                  修正する
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!selectedDate) {
                      return;
                    }

                    setIsSubmitting(true);

                    try {
                      const response = await fetch("/api/bookings", {
                        method: "POST",

                        headers: {
                          "Content-Type": "application/json",
                        },

                        body: JSON.stringify({
                          name,
                          contact,
                          songTitle,
                          service,
                          singers,
                          chorusCount,
                          materialLinks,
                          requestNote,
                          paymentMethod: "bank_transfer",
                          deliveryDate: selectedDate,
                        }),
                      });

                      const data = await response.json();

                      if (!response.ok) {
                        alert(data.error ?? "送信に失敗しました。");

                        if (response.status === 409) {
                          const updated = await fetchAvailability(
                            service,
                            singers,
                          );

                          setSchedule(updated.availability ?? []);

                          setEarliestDate(
                            updated.earliestAvailableDate ?? null,
                          );

                          setLoadedAvailabilityKey(`${service}:${singers}`);

                          setSelectedDate(null);

                          setIsConfirming(false);
                        }

                        return;
                      }

                      setClientProjectPath(
                        typeof data.clientProjectPath === "string"
                          ? data.clientProjectPath
                          : null,
                      );

                      setIsCompleted(true);
                    } catch (error) {
                      console.error(error);

                      alert("送信中にエラーが発生しました。");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-1/2 rounded-xl border-2 border-black bg-black px-4 py-3 font-black text-white disabled:opacity-40"
                >
                  {isSubmitting ? "送信中..." : "この内容で依頼する"}
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
