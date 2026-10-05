"use client";

import Link from "next/link";

import { FormEvent, useEffect, useState } from "react";

type PortfolioItem = {
  id: number;
  title: string;
  creatorName: string | null;
  url: string;
  thumbnailUrl: string | null;
  category: string | null;
  published: boolean;
  sortOrder: number;
};

type QueuedBooking = {
  id: number;
  name: string;
  songTitle: string;
  serviceType: string;
  portfolioPermission: string;
  portfolioQueued: boolean;
};

const categories = ["女性Vo", "男性Vo", "コラボ", "short", "その他"];

async function fetchPortfolio(): Promise<PortfolioItem[]> {
  const response = await fetch("/api/portfolio");

  if (!response.ok) {
    throw new Error("作品一覧の取得に失敗しました");
  }

  const data = await response.json();

  return data.items ?? [];
}

async function fetchQueuedBookings(): Promise<QueuedBooking[]> {
  const response = await fetch("/api/bookings");

  if (!response.ok) {
    throw new Error("掲載待ち案件の取得に失敗しました");
  }

  const data = await response.json();

  return (data.bookings ?? []).filter(
    (booking: QueuedBooking) =>
      booking.portfolioPermission === "approved" &&
      booking.portfolioQueued === true,
  );
}

export default function PortfolioAdminPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);

  const [queuedBookings, setQueuedBookings] = useState<QueuedBooking[]>([]);

  const [sourceBookingId, setSourceBookingId] = useState<number | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");

  const [creatorName, setCreatorName] = useState("");

  const [url, setUrl] = useState("");

  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const [category, setCategory] = useState("女性Vo");

  const [published, setPublished] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchPortfolio(), fetchQueuedBookings()])
      .then(([portfolioItems, bookings]) => {
        if (cancelled) {
          return;
        }

        setItems(portfolioItems);

        setQueuedBookings(bookings);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  async function reload() {
    const [portfolioItems, bookings] = await Promise.all([
      fetchPortfolio(),
      fetchQueuedBookings(),
    ]);

    setItems(portfolioItems);

    setQueuedBookings(bookings);
  }

  function clearForm() {
    setEditingId(null);
    setSourceBookingId(null);
    setTitle("");
    setCreatorName("");
    setUrl("");
    setThumbnailUrl("");
    setCategory("女性Vo");
    setPublished(true);
  }

  function startEditing(item: PortfolioItem) {
    setEditingId(item.id);
    setSourceBookingId(null);
    setTitle(item.title);
    setCreatorName(item.creatorName ?? "");
    setUrl(item.url);
    setThumbnailUrl(item.thumbnailUrl ?? "");
    setCategory(item.category ?? "その他");
    setPublished(item.published);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function useQueuedBooking(booking: QueuedBooking) {
    setEditingId(null);
    setSourceBookingId(booking.id);
    setTitle(booking.songTitle);
    setCreatorName(booking.name);
    setUrl("");
    setThumbnailUrl("");
    setPublished(true);
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault();

    if (!title.trim() || !url.trim()) {
      alert("タイトルと作品URLは必須です。");

      return;
    }

    setIsSaving(true);

    try {
      if (editingId === null) {
        const response = await fetch("/api/portfolio", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            title,
            creatorName,
            url,
            thumbnailUrl,
            category,
            sourceBookingId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error ?? "作品追加に失敗しました。");

          return;
        }

        // 新規追加時に非公開を選んでいた場合
        if (!published) {
          await fetch("/api/portfolio", {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              id: data.item.id,
              published: false,
            }),
          });
        }
      } else {
        const response = await fetch("/api/portfolio", {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: editingId,
            title,
            creatorName,
            url,
            thumbnailUrl,
            category,
            published,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error ?? "作品更新に失敗しました。");

          return;
        }
      }

      await reload();
      clearForm();
    } catch (error) {
      console.error(error);

      alert("保存中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublished(item: PortfolioItem) {
    const response = await fetch("/api/portfolio", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id: item.id,
        published: !item.published,
      }),
    });

    if (!response.ok) {
      alert("公開状態の変更に失敗しました。");

      return;
    }

    await reload();
  }

  async function deleteItem(item: PortfolioItem) {
    const ok = window.confirm(`「${item.title}」を削除しますか？`);

    if (!ok) {
      return;
    }

    const response = await fetch("/api/portfolio", {
      method: "DELETE",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id: item.id,
      }),
    });

    if (!response.ok) {
      alert("削除に失敗しました。");

      return;
    }

    await reload();

    if (editingId === item.id) {
      clearForm();
    }
  }

  async function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const ordered = [...items];

    const [moved] = ordered.splice(index, 1);

    ordered.splice(targetIndex, 0, moved);

    // 先に見た目を変更
    setItems(ordered);

    try {
      await Promise.all(
        ordered.map((item, sortOrder) =>
          fetch("/api/portfolio", {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              id: item.id,
              sortOrder,
            }),
          }),
        ),
      );

      await reload();
    } catch (error) {
      console.error(error);

      alert("並び替えに失敗しました。");

      await reload();
    }
  }

  const publishedCount = items.filter((item) => item.published).length;

  return (
    <main className="min-h-screen bg-[#f7f1df] px-4 py-8 text-[#202020] md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em]">WRAYMIX ADMIN</p>

            <h1 className="mt-1 text-4xl font-black tracking-tight md:text-6xl">
              PORTFOLIO
            </h1>

            <p className="mt-3 text-sm text-black/60">
              TOPページに表示する作品を管理します。
            </p>
          </div>
        </header>

        {/* STATS */}

        <div className="mt-7 flex flex-wrap gap-3">
          <div className="rounded-xl border-2 border-black bg-[#bfe3d1] px-4 py-3">
            <p className="text-[10px] font-black tracking-widest">PUBLISHED</p>

            <p className="text-2xl font-black">{publishedCount}</p>
          </div>

          <div className="rounded-xl border-2 border-black bg-[#dcd4f5] px-4 py-3">
            <p className="text-[10px] font-black tracking-widest">TOTAL</p>

            <p className="text-2xl font-black">{items.length}</p>
          </div>
        </div>

        {/* QUEUE */}

        <details className="mt-8 rounded-3xl border-2 border-black bg-[#f5d48d] p-5 shadow-[5px_5px_0_#202020]">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black tracking-[0.18em]">WAITING</p>

                <h2 className="mt-1 text-2xl font-black">
                  掲載待ち {queuedBookings.length}件
                </h2>
              </div>

              <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black">
                開く
              </span>
            </div>
          </summary>

          <div className="mt-5 space-y-3">
            {queuedBookings.length === 0 ? (
              <div className="rounded-xl bg-white/55 p-4 text-sm text-black/55">
                掲載待ちの案件はありません。
              </div>
            ) : (
              queuedBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-black bg-white p-4"
                >
                  <div>
                    <p className="font-black">{booking.songTitle}</p>

                    <p className="mt-1 text-xs text-black/55">
                      {booking.name} / BOOKING #{booking.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-black"
                    >
                      案件を見る
                    </Link>

                    <button
                      type="button"
                      onClick={() => useQueuedBooking(booking)}
                      className="rounded-lg border-2 border-black bg-black px-3 py-2 text-xs font-black text-white"
                    >
                      この作品を登録
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
        {/* FORM */}

        <section className="mt-8 rounded-3xl border-2 border-black bg-[#f6cbd3] p-6 shadow-[6px_6px_0_#202020]">
          <p className="text-xs font-black tracking-[0.2em]">
            {editingId ? "EDIT WORK" : "ADD WORK"}
          </p>

          <h2 className="mt-1 text-2xl font-black">
            {editingId ? "作品を編集" : "作品を追加"}
          </h2>

          {sourceBookingId !== null && editingId === null && (
            <p className="mt-3 inline-flex rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black">
              BOOKING #{sourceBookingId} から登録
            </p>
          )}

          <form onSubmit={saveItem} className="mt-6 grid gap-5">
            <label>
              <span className="font-bold">作品タイトル *</span>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                placeholder="例：○○○○ / Cover"
              />
            </label>

            <label>
              <span className="font-bold">歌い手・表示名</span>

              <input
                value={creatorName}
                onChange={(event) => setCreatorName(event.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                placeholder="例：○○さん"
              />
            </label>

            <label>
              <span className="font-bold">作品URL *</span>

              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                placeholder="https://..."
              />
            </label>

            <label>
              <span className="font-bold">サムネイル画像URL</span>

              <input
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
                placeholder="https://..."
              />

              <p className="mt-2 text-xs text-black/50">
                今は画像URL方式。後で画像アップロード対応も可能。
              </p>
            </label>

            {thumbnailUrl && (
              <div>
                <p className="mb-2 text-sm font-bold">PREVIEW</p>

                <div
                  className="h-40 max-w-xs rounded-2xl border-2 border-black bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${thumbnailUrl}")`,
                  }}
                />
              </div>
            )}

            <label>
              <span className="font-bold">カテゴリ</span>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-black bg-[#fffdf8] p-3"
              >
                {categories.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                className="h-5 w-5"
              />
              公開する
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl border-2 border-black bg-black px-6 py-3 font-black text-white disabled:opacity-40"
              >
                {isSaving
                  ? "保存中..."
                  : editingId
                    ? "SAVE CHANGES"
                    : "ADD WORK"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={clearForm}
                  className="rounded-xl border-2 border-black bg-white px-6 py-3 font-black"
                >
                  CANCEL
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LIST */}

        <section className="mt-10">
          <p className="text-xs font-black tracking-[0.2em]">WORKS</p>

          <h2 className="mt-1 text-2xl font-black">登録作品</h2>

          <div className="mt-5 space-y-3">
            {items.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-black/30 p-10 text-center text-black/50">
                まだ作品がありません。
              </div>
            ) : (
              items.map((item, index) => (
                <article
                  key={item.id}
                  className={`rounded-2xl border-2 border-black p-4 shadow-[3px_3px_0_#202020] ${
                    item.published ? "bg-white" : "bg-[#e5e1df]"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* THUMBNAIL */}

                    <div
                      className="h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-[#dcd4f5] bg-cover bg-center"
                      style={
                        item.thumbnailUrl
                          ? {
                              backgroundImage: `url("${item.thumbnailUrl}")`,
                            }
                          : undefined
                      }
                    >
                      {!item.thumbnailUrl && (
                        <div className="flex h-full items-center justify-center text-[10px] font-black tracking-widest">
                          WRAYMIX
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black">
                            {item.title}
                          </h3>

                          {item.creatorName && (
                            <p className="mt-0.5 text-sm text-black/60">
                              {item.creatorName}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full border border-black px-2 py-1 text-[10px] font-black ${
                            item.published ? "bg-[#bfe3d1]" : "bg-[#ddd]"
                          }`}
                        >
                          {item.published ? "公開中" : "非公開"}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.category && (
                          <span className="rounded-full bg-[#f5d48d] px-2 py-1 text-[10px] font-black">
                            {item.category}
                          </span>
                        )}

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold underline"
                        >
                          作品を開く ↗
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* CONTROLS */}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/15 pt-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveItem(index, -1)}
                        className="h-9 w-9 rounded-lg border-2 border-black bg-white font-black disabled:opacity-20"
                        title="上へ"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => moveItem(index, 1)}
                        className="h-9 w-9 rounded-lg border-2 border-black bg-white font-black disabled:opacity-20"
                        title="下へ"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => togglePublished(item)}
                        className="rounded-lg border-2 border-black bg-[#dcd4f5] px-3 py-2 text-xs font-black"
                      >
                        {item.published ? "非公開にする" : "公開する"}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditing(item)}
                        className="rounded-lg border-2 border-black bg-white px-3 py-2 text-xs font-black"
                      >
                        EDIT
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        className="rounded-lg border-2 border-black bg-[#ead7dc] px-3 py-2 text-xs font-black"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
