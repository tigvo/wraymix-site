"use client";

import Link from "next/link";

import Image from "next/image";

import SiteFooter from "@/components/SiteFooter";

import { useEffect, useMemo, useState } from "react";

type PortfolioItem = {
  id: number;
  title: string;
  creatorName: string | null;
  url: string;
  thumbnailUrl: string | null;
  category: string | null;
};

type AvailabilityResponse = {
  earliestAvailableDate: string | null;
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/* =========================
   YouTube
========================= */

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);

    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const watchId = parsed.searchParams.get("v");

      if (watchId) {
        return watchId;
      }

      const parts = parsed.pathname.split("/").filter(Boolean);

      if (
        parts[0] === "shorts" ||
        parts[0] === "embed" ||
        parts[0] === "live"
      ) {
        return parts[1] ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeEmbedUrl(url: string) {
  const id = getYouTubeVideoId(url);

  if (!id) {
    return null;
  }

  return `https://www.youtube.com/embed/${id}?rel=0&playsinline=1`;
}

function getYouTubeThumbnail(url: string) {
  const id = getYouTubeVideoId(url);

  if (!id) {
    return null;
  }

  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/* ========================= */

const preferredCategoryOrder = ["男性Vo", "女性Vo", "コラボ"];

const includedServices = [
  "ピッチ補正",
  "タイミング補正",
  "ノイズ処理",
  "EQ / COMP",
  "ハモリ生成",
  "空間処理",
  "マスタリング",
];

const plans = [
  {
    label: "FULL COURSE",
    title: "フルコーラス",
    price: "¥6,500〜",
    description: "フルサイズの楽曲・歌ってみた向け。",
    additional: "ボーカル1人追加につき +¥3,500",
    accent: "#dcd4f5",
  },
  {
    label: "ONE CHORUS",
    title: "ワンコーラス",
    price: "¥4,500〜",
    description: "1サビ程度までの短めの楽曲向け。",
    additional: "ボーカル1人追加につき +¥2,500",
    accent: "#bfe3d1",
  },
  {
    label: "SHORT",
    title: "short",
    price: "¥2,500〜",
    description: "サビのみ・ショート動画などの短尺向け。",
    additional: "ボーカル1人追加につき +¥1,000",
    accent: "#f5d48d",
  },
];

const orderSteps = [
  {
    number: "01",
    title: "内容を選択",
    text: "コース・人数・初稿希望日を選択します。",
  },
  {
    number: "02",
    title: "依頼を送信",
    text: "必要事項と素材内容を入力して送信します。",
  },
  {
    number: "03",
    title: "内容確認",
    text: "尺・コーラス・オプション等を確認し、最終料金を確定します。",
  },
  {
    number: "04",
    title: "制作・初稿",
    text: "MIX制作後、選択いただいた初稿予定日にお渡しします。",
  },
];

export default function Home() {
  const [nextSlot, setNextSlot] = useState<string | null>(null);

  const [works, setWorks] = useState<PortfolioItem[]>([]);

  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [selectedWorkId, setSelectedWorkId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/availability?service=full&singers=1").then(
        async (response) => {
          if (!response.ok) {
            throw new Error("空き状況の取得に失敗しました");
          }

          return response.json();
        },
      ),

      fetch("/api/portfolio?public=1").then(async (response) => {
        if (!response.ok) {
          throw new Error("作品一覧の取得に失敗しました");
        }

        return response.json();
      }),
    ])
      .then(([availability, portfolio]) => {
        const availabilityData = availability as AvailabilityResponse;

        const portfolioItems = portfolio.items ?? [];

        setNextSlot(availabilityData.earliestAvailableDate);

        setWorks(portfolioItems);

        const firstYouTube = portfolioItems.find((item: PortfolioItem) =>
          Boolean(getYouTubeVideoId(item.url)),
        );

        setSelectedWorkId(firstYouTube?.id ?? portfolioItems[0]?.id ?? null);
      })
      .catch(console.error);
  }, []);

  const categories = useMemo(() => {
    const existing = Array.from(
      new Set(
        works
          .map((item) => item.category)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const preferred = preferredCategoryOrder.filter((category) =>
      existing.includes(category),
    );

    const remaining = existing.filter(
      (category) => !preferredCategoryOrder.includes(category),
    );

    return ["ALL", ...preferred, ...remaining];
  }, [works]);

  const filteredWorks = useMemo(() => {
    if (selectedCategory === "ALL") {
      return works;
    }

    return works.filter((item) => item.category === selectedCategory);
  }, [works, selectedCategory]);

  const selectedWork = useMemo(() => {
    if (selectedWorkId === null) {
      return null;
    }

    return works.find((item) => item.id === selectedWorkId) ?? null;
  }, [works, selectedWorkId]);

  const selectedEmbedUrl = selectedWork
    ? getYouTubeEmbedUrl(selectedWork.url)
    : null;

  function changeCategory(category: string) {
    setSelectedCategory(category);

    const nextWorks =
      category === "ALL"
        ? works
        : works.filter((item) => item.category === category);

    const firstYouTube = nextWorks.find((item) =>
      Boolean(getYouTubeVideoId(item.url)),
    );

    setSelectedWorkId(firstYouTube?.id ?? nextWorks[0]?.id ?? null);
  }

  function selectWork(item: PortfolioItem) {
    if (getYouTubeVideoId(item.url)) {
      setSelectedWorkId(item.id);

      return;
    }

    window.open(item.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <main className="text-[#202020]">
        {/* =========================
          HERO
      ========================= */}

        <section className="bg-[#f7f1df] px-5 py-6 md:px-10">
          <header className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/" className="text-xl font-black">
              WRAYMIX
            </Link>

            <nav className="hidden gap-7 text-sm font-bold md:flex">
              <a href="#works">WORKS</a>

              <a href="#price">PRICE</a>

              <a href="#order">ORDER</a>
            </nav>

            <Link
              href="/booking"
              className="rounded-full border-2 border-black bg-black px-5 py-2 text-sm font-black text-white"
            >
              REQUEST
            </Link>
          </header>

          <div className="mx-auto grid max-w-6xl items-center gap-10 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-20">
            {/* LEFT */}
            <div>
              <p className="text-sm font-black tracking-[0.25em]">
                VOCAL MIX FOR SINGER
              </p>

              <h1 className="mt-5 text-6xl font-black leading-[0.9] tracking-[-0.06em] md:text-7xl lg:text-8xl">
                MAKE YOUR
                <br />
                VOCAL SHINE.
              </h1>

              <p className="mt-7 max-w-xl text-base font-medium leading-7">
                歌ってみたのMIXを承っています。
                <br />
                空き状況を確認しながら、そのまま初稿希望日を選んでご依頼いただけます。
              </p>

              <div className="mt-9 flex flex-wrap items-stretch gap-3">
                <Link
                  href="/booking"
                  className="inline-flex h-[54px] items-center justify-center gap-2 rounded-xl border-2 border-black bg-black px-6 font-black leading-none text-white shadow-[4px_4px_0_#bfe3d1]"
                >
                  <span>依頼する</span>
                  <span aria-hidden="true">→</span>
                </Link>

                {nextSlot && (
                  <div className="flex h-[54px] flex-col justify-center rounded-xl border-2 border-black bg-[#bfe3d1] px-5">
                    <p className="text-[9px] font-black leading-none tracking-widest">
                      NEXT SLOT
                    </p>

                    <p className="mt-1 text-sm font-black leading-none">
                      最短 {formatDate(nextSlot)} 初稿
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="relative mx-auto mt-3 w-full max-w-[390px]">
              <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[32px] bg-[#dcd4f5]" />

              <div className="relative overflow-hidden rounded-[32px] border-2 border-black bg-white shadow-[6px_6px_0_#202020]">
                <Image
                  src="/hero.jpg"
                  alt="WRAYMIX"
                  width={400}
                  height={400}
                  priority
                  className="h-auto w-full"
                />
              </div>

              {/* <div className="absolute -bottom-4 -left-5 rounded-full border-2 border-black bg-[#f5d48d] px-3 py-1.5 text-[10px] font-black">
                VOCAL MIX
              </div> */}
            </div>
          </div>
        </section>

        {/* =========================
          WORKS
      ========================= */}

        <section
          id="works"
          className="bg-[#dcd4f5] px-5 py-20 md:px-10 md:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-5xl font-black tracking-[-0.05em] md:text-7xl">
              WORKS
            </p>

            <p className="mt-2 text-black/55">これまで担当した作品</p>

            {categories.length > 1 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => changeCategory(category)}
                    className={`rounded-full border-2 border-black px-4 py-2 text-xs font-black transition ${
                      selectedCategory === category
                        ? "bg-black text-white"
                        : "bg-[#fffdf8] hover:-translate-y-0.5"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            {/* PCでは左右同じ高さ */}

            <div className="mt-8 grid gap-7 lg:h-[560px] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
              {/* LEFT PLAYER */}

              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-2 border-black bg-[#fffdf8] shadow-[6px_6px_0_#202020]">
                {selectedWork && selectedEmbedUrl ? (
                  <>
                    <div className="shrink-0 bg-black">
                      <iframe
                        key={selectedWork.id}
                        src={selectedEmbedUrl}
                        title={selectedWork.title}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-5 md:p-6">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.18em]">
                          NOW PLAYING
                        </p>

                        <h3 className="mt-2 text-xl font-black md:text-2xl">
                          {selectedWork.title}
                        </h3>

                        {selectedWork.creatorName && (
                          <p className="mt-1 text-sm text-black/55">
                            {selectedWork.creatorName}
                          </p>
                        )}
                      </div>

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        {selectedWork.category && (
                          <span className="rounded-full bg-[#f5d48d] px-3 py-1 text-[10px] font-black">
                            {selectedWork.category}
                          </span>
                        )}

                        <a
                          href={selectedWork.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black"
                        >
                          YouTubeで開く ↗
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center p-10 text-center">
                    <div>
                      <p className="text-xs font-black tracking-[0.2em]">
                        PLAYER
                      </p>

                      <p className="mt-3 text-sm text-black/45">
                        右の作品を選択すると、
                        <br />
                        ここで再生できます。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT LIST */}

              <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-2 border-black bg-[#fffdf8] shadow-[6px_6px_0_#202020]">
                <div className="flex shrink-0 items-center justify-between border-b-2 border-black px-5 py-4">
                  <div>
                    <p className="text-[10px] font-black tracking-[0.18em]">
                      PORTFOLIO
                    </p>

                    <p className="mt-0.5 text-sm font-black">
                      {filteredWorks.length} WORKS
                    </p>
                  </div>

                  <span className="text-xs font-bold text-black/40">
                    SCROLL ↓
                  </span>
                </div>

                <div className="max-h-[480px] overflow-y-auto lg:max-h-none lg:flex-1">
                  {filteredWorks.length === 0 ? (
                    <div className="p-10 text-center text-sm text-black/45">
                      表示できる作品がありません。
                    </div>
                  ) : (
                    filteredWorks.map((item, index) => {
                      const videoId = getYouTubeVideoId(item.url);

                      const thumbnail =
                        item.thumbnailUrl || getYouTubeThumbnail(item.url);

                      const isYouTube = Boolean(videoId);

                      const selected = selectedWorkId === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectWork(item)}
                          className={`group flex w-full items-center gap-4 p-4 text-left transition md:p-5 ${
                            index !== filteredWorks.length - 1
                              ? "border-b-2 border-black/10"
                              : ""
                          } ${
                            selected ? "bg-[#f6cbd3]" : "hover:bg-[#f6cbd3]/30"
                          }`}
                        >
                          <div
                            className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-[#bfe3d1] bg-cover bg-center md:h-[76px] md:w-[120px]"
                            style={
                              thumbnail
                                ? {
                                    backgroundImage: `url("${thumbnail}")`,
                                  }
                                : undefined
                            }
                          >
                            {!thumbnail && (
                              <div className="flex h-full items-center justify-center text-[9px] font-black tracking-widest">
                                WRAYMIX
                              </div>
                            )}

                            {isYouTube && (
                              <span
                                className={`absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black text-xs font-black shadow-[2px_2px_0_#202020] ${
                                  selected
                                    ? "bg-black text-white"
                                    : "bg-white/90"
                                }`}
                              >
                                ▶
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 font-black leading-tight md:text-lg">
                              {item.title}
                            </h3>

                            {item.creatorName && (
                              <p className="mt-1 truncate text-xs text-black/50 md:text-sm">
                                {item.creatorName}
                              </p>
                            )}

                            {item.category && (
                              <span className="mt-2 inline-flex rounded-full bg-[#f5d48d] px-2 py-0.5 text-[9px] font-black">
                                {item.category}
                              </span>
                            )}
                          </div>

                          <span className="shrink-0 font-black">
                            {selected ? "●" : "→"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
          PRICE + SERVICE
      ========================= */}

        <section
          id="price"
          className="bg-[#f6d3ae] px-5 py-20 md:px-10 md:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-5xl font-black tracking-[-0.05em] md:text-7xl">
              PRICE
            </p>

            <p className="mt-2 text-black/55">基本料金・サービス内容</p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.label}
                  className="flex min-h-[300px] flex-col rounded-3xl border-2 border-black bg-[#fffaf2] p-6 shadow-[5px_5px_0_#202020]"
                >
                  <div
                    className="mb-5 h-2 w-16 rounded-full"
                    style={{
                      background: plan.accent,
                    }}
                  />

                  <p className="text-xs font-black tracking-[0.18em]">
                    {plan.label}
                  </p>

                  <h3 className="mt-2 text-2xl font-black">{plan.title}</h3>

                  <p className="mt-4 text-4xl font-black">{plan.price}</p>

                  <p className="mt-4 text-sm leading-6 text-black/65">
                    {plan.description}
                  </p>

                  <div className="mt-auto border-t border-black/25 pt-4">
                    <p className="text-sm font-black">{plan.additional}</p>
                  </div>
                </article>
              ))}
            </div>

            {/* INCLUDED */}

            {/* INCLUDED */}

            <div className="mt-10 border-t-2 border-black/20 pt-8">
              <p className="text-xs font-black tracking-[0.18em]">INCLUDED</p>

              <h3 className="mt-1 text-xl font-black">基本作業内容</h3>

              <div className="mt-5 flex flex-wrap gap-2">
                {includedServices.map((service) => (
                  <span
                    key={service}
                    className="rounded-full border-2 border-black bg-[#fffaf2] px-4 py-2 text-xs font-black"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            {/* OPTIONS & NOTES */}

            <div className="mt-9 border-t-2 border-black/20 pt-8">
              <p className="text-xs font-black tracking-[0.18em]">
                OPTIONS & NOTES
              </p>

              <div className="mt-5 grid gap-x-10 gap-y-5 md:grid-cols-3">
                <div>
                  <p className="text-sm font-black">追加トラック</p>

                  <p className="mt-1 text-lg font-black">1パート +¥500</p>
                </div>

                <div>
                  <p className="text-sm font-black">ハモリガイド作成</p>

                  <p className="mt-1 text-lg font-black">+¥2,000</p>
                </div>

                <div>
                  <p className="text-sm font-black">お急ぎ対応</p>

                  <p className="mt-1 text-lg font-black">2日後まで +50%</p>
                </div>
              </div>

              <div className="mt-6 space-y-1.5 text-xs leading-5 text-black/60">
                <p>
                  ※ ハモリ素材がない場合のハモリ生成は、基本料金内で対応します。
                </p>

                <p>
                  ※ コーラス本数・尺・特殊な構成などにより、
                  追加料金が発生する場合があります。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
          ORDER + NOTES
      ========================= */}

        <section
          id="order"
          className="bg-[#bfe3d1] px-5 py-20 md:px-10 md:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-5xl font-black tracking-[-0.05em] md:text-7xl">
              ORDER GUIDE
            </p>

            <p className="mt-2 text-black/55">ご依頼から初稿まで</p>

            {/* FLOW */}

            <div className="mt-10 grid gap-3 md:grid-cols-4">
              {orderSteps.map((step) => (
                <div
                  key={step.number}
                  className="rounded-2xl bg-[#eef8f2]/70 p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-[11px] font-black text-white">
                      {step.number}
                    </span>

                    <h3 className="text-lg font-black">{step.title}</h3>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-black/65">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>

            {/* NOTES */}

            <div className="mt-12">
              <p className="text-xs font-black tracking-[0.18em]">
                BEFORE REQUEST
              </p>

              <h3 className="mt-1 text-2xl font-black">
                ご依頼前にご確認ください
              </h3>

              <div className="mt-7 grid gap-x-10 gap-y-0 md:grid-cols-2">
                <div className="border-t-2 border-black py-5">
                  <p className="font-black">素材について</p>

                  <p className="mt-2 text-sm leading-6 text-black/65">
                    ボーカル素材はWAV形式を推奨しています。
                    可能であればモノラルで書き出してください。
                  </p>
                </div>

                <div className="border-t-2 border-black py-5">
                  <p className="font-black">頭出し</p>

                  <p className="mt-2 text-sm leading-6 text-black/65">
                    instとボーカルの開始位置が合う状態で書き出していただくと、確認がスムーズです。
                  </p>
                </div>

                <div className="border-t-2 border-black py-5">
                  <p className="font-black">初稿希望日について</p>

                  <p className="mt-2 text-sm leading-6 text-black/65">
                    予約画面で選択する日付は、最終納品日ではなく初稿のお渡し予定日です。
                    修正対応は初稿確認後となります。
                  </p>
                </div>

                <div className="border-t-2 border-black py-5">
                  <p className="font-black">録音状態について</p>

                  <p className="mt-2 text-sm leading-6 text-black/65">
                    強いノイズや音割れなど、素材の状態によっては対応方法をご相談させていただく場合があります。
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-t-2 border-black pt-7">
                <p className="max-w-xl text-sm leading-6">
                  録音方法や素材の用意について分からない場合も、お気軽にご相談ください。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f5d48d] px-5 py-14 md:px-10 md:py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[minmax(0,560px)_auto] md:items-center md:justify-center md:gap-14">
            <div>
              <p className="text-4xl font-black tracking-[-0.04em] md:text-6xl">
                REQUEST
              </p>

              <h2 className="mt-2 text-xl font-black md:text-2xl">
                ご依頼はこちらから
              </h2>

              <p className="mt-2 text-sm leading-6 text-black/65">
                空き状況を確認して、初稿希望日を選んでご依頼いただけます。
              </p>
            </div>

            <Link
              href="/booking"
              className="w-fit rounded-xl border-2 border-black bg-black px-7 py-4 text-center font-black text-white shadow-[5px_5px_0_#fff] transition hover:-translate-y-0.5"
            >
              依頼ページへ →
            </Link>
          </div>
        </section>

        {/* =========================
          FOOTER
      ========================= */}

        {/* <footer className="bg-[#202020] px-5 py-10 text-white md:px-10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xl font-black">WRAYMIX</p>

              <p className="mt-1 text-xs text-white/45">VOCAL MIX FOR SINGER</p>
            </div>

            <div className="flex items-center gap-5 text-sm font-bold">
              <a href="#works">WORKS</a>

              <a href="#price">PRICE</a>

              <a href="#order">ORDER</a>

              <Link
                href="/booking"
                className="rounded-full bg-white px-4 py-2 text-black"
              >
                REQUEST
              </Link>
            </div>
          </div>
        </footer> */}
      </main>

      <SiteFooter />
    </>
  );
}
