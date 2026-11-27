"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Allocation = { id: number; date: string; points: number; booking: Booking };
type Booking = {
  id: number; name: string; contact: string; songTitle: string; createdAt: string;
  serviceType: string; singerCount: number; chorusCount: number;
  status: string; planLabel: string | null; quotedPrice: number | null;
  deliveryDate: string; costPoint: number; isExpress: boolean;
  materialLinks: string | null; requestNote: string | null; adminNote: string | null;
};
type ScheduleDay = { id: number; date: string; capacity: number; used: number; allocations: Allocation[] };
type CalendarEvent = { id: number; date: string; title: string };
type View = "month" | "week";
const statuses = [
  ["pending_review", "確認待ち"], ["reserved", "受付確定"],
  ["first_draft", "初稿提出"], ["revision", "修正中"],
  ["delivered", "納品済み"], ["cancelled", "キャンセル"],
] as const;
const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
const input = "w-full rounded-lg border border-black/30 bg-white px-3 py-2 text-sm outline-offset-2";
const button = "rounded-lg border-2 border-black px-3 py-2 text-xs font-black transition hover:-translate-y-0.5";
function dateString(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}
function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(value: string, amount: number) {
  const d = parseDate(value);
  d.setDate(d.getDate() + amount);
  return dateString(d);
}
function weekStart(value: string) {
  const date = parseDate(value);
  date.setDate(date.getDate() - date.getDay());
  return dateString(date);
}
function range(start: string, end: string) {
  const [first, last] = [start, end].sort();
  const dates: string[] = [];
  for (let date = first; date <= last; date = addDays(date, 1)) dates.push(date);
  return dates;
}
function urls(text: string | null) {
  return [...new Set((text ?? "").match(/https?:\/\/[^\s<>「」]+/g) ?? [])].map((x) => x.replace(/[.,、。)）]+$/, ""));
}
function referenceUrls(booking: Booking) {
  const text = [booking.requestNote, booking.adminNote].filter(Boolean).join("\n");
  return [...new Set(text.split("\n").filter((line) => /参考|reference|ref\s*:/i.test(line)).flatMap((line) => urls(line)))];
}
function safeFolderPart(value: string) {
  return value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/[. ]+$/g, "").trim().replace(/\s+/g, " ") || "未設定";
}
function bookingFolderName(booking: Booking) {
  const created = new Date(booking.createdAt);
  const date = Number.isNaN(created.getTime())
    ? booking.deliveryDate.replace(/-/g, "")
    : new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(created).replace(/-/g, "");
  return `${date}_${safeFolderPart(booking.songTitle)}_${safeFolderPart(booking.name)}`;
}
function statusName(value: string) {
  return statuses.find(([key]) => key === value)?.[1] ?? value;
}
function pillColor(status: string) {
  if (status === "pending_review") return "bg-[#f5d48d]";
  if (status === "reserved") return "bg-[#bfe3d1]";
  if (status === "revision") return "bg-[#dcd4f5]";
  return "bg-[#eee9e0]";
}
async function jsonFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "通信に失敗しました");
  return data;
}

function BookingPanel({ booking, onRefresh }: { booking: Booking; onRefresh: () => Promise<void> }) {
  const [status, setStatus] = useState(booking.status);
  const [memo, setMemo] = useState(booking.adminNote ?? "");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setStatus(booking.status);
    setMemo(booking.adminNote ?? "");
    setReference("");
    setFeedback("");
  }, [booking.id, booking.status, booking.adminNote]);
  const material = urls(booking.materialLinks);
  const references = referenceUrls(booking);
  const folderName = bookingFolderName(booking);
  async function copyFolderName() {
    try {
      await navigator.clipboard.writeText(folderName);
      setFeedback("フォルダ名をコピーしました");
    } catch {
      setFeedback("コピーに失敗しました。表示されたテキストを選択してコピーしてください");
    }
  }
  async function save() {
    setSaving(true);
    setFeedback("");
    const newReferences = reference.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (newReferences.some((s) => { try { const u = new URL(s); return !["http:", "https:"].includes(u.protocol); } catch { return true; } })) {
      setFeedback("参考音源はhttp(s)のURLを入力してください");
      setSaving(false);
      return;
    }
    try {
      const nextMemo = [memo.trim(), ...newReferences.map((url) => `参考音源: ${url}`)].filter(Boolean).join("\n");
      await jsonFetch("/api/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status, adminNote: nextMemo }),
      });
      setReference("");
      await onRefresh();
      setFeedback("保存しました");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "保存に失敗しました");
    } finally { setSaving(false); }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-widest text-black/45">BOOKING #{booking.id}</p>
          <h2 className="mt-1 break-words text-xl font-black">{booking.songTitle}</h2>
          <p className="text-sm text-black/65">{booking.name} ・ {booking.contact}</p>
        </div>
        <Link href={`/admin/bookings/${booking.id}`} className={button + " shrink-0 bg-white"}>詳細 ↗</Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-[#f7f1df] p-2"><span className="block text-black/50">初稿日</span><b>{booking.deliveryDate.slice(5)}</b></div>
        <div className="rounded-lg bg-[#f7f1df] p-2"><span className="block text-black/50">料金</span><b>{booking.quotedPrice === null ? "未確定" : `¥${booking.quotedPrice.toLocaleString()}`}</b></div>
        <div className="rounded-lg bg-[#f7f1df] p-2"><span className="block text-black/50">作業量</span><b>{booking.costPoint}pt</b></div>
      </div>
      <section className="rounded-xl border border-black/20 bg-[#f7f1df] p-3">
        <p className="text-xs font-black">プロジェクトフォルダ名</p>
        <div className="mt-2 flex items-center gap-2">
          <input className={input + " min-w-0 flex-1 font-mono text-xs"} readOnly aria-label="プロジェクトフォルダ名" value={folderName}
            onFocus={(event) => event.target.select()} />
          <button type="button" onClick={copyFolderName} className={button + " shrink-0 bg-[#dcd4f5]"}>コピー</button>
        </div>
        <p className="mt-1 text-[11px] text-black/50">依頼登録日（日本時間）_曲名_依頼者名</p>
      </section>
      <section className="rounded-xl border-2 border-black bg-[#f5d48d] p-3">
        <label className="block text-xs font-black">ステータス変更</label>
        <select className={input + " mt-2"} value={status} disabled={booking.status === "cancelled"}
          onChange={(event) => setStatus(event.target.value)}>
          {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {status === "cancelled" && booking.status !== "cancelled" &&
          <p className="mt-1 text-xs text-red-700">キャンセルすると作業枠から外れます。復活はできません。</p>}
      </section>
      <section>
        <h3 className="text-sm font-black">素材・音源リンク</h3>
        <div className="mt-2 space-y-1">
          {material.map((url, i) =>
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block truncate rounded-lg border border-black/15 bg-[#edf7f2] px-3 py-2 text-xs font-bold" title={url}>音源・素材 {i + 1} ↗ <span className="font-normal text-black/50">{url}</span></a>)}
          {material.length === 0 && <p className="text-xs text-black/45">素材リンク未登録</p>}
        </div>
      </section>
      <section>
        <h3 className="text-sm font-black">参考音源リンク</h3>
        <div className="mt-2 space-y-1">
          {references.map((url, i) =>
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block truncate rounded-lg border border-black/15 bg-[#f1edff] px-3 py-2 text-xs font-bold" title={url}>参考音源 {i + 1} ↗ <span className="font-normal text-black/50">{url}</span></a>)}
          {references.length === 0 && <p className="text-xs text-black/45">参考音源リンク未登録</p>}
        </div>
        <textarea rows={2} className={input + " mt-2"} placeholder="参考音源URLを追加（1行に1件）" value={reference} onChange={(e) => setReference(e.target.value)} />
      </section>
      <section>
        <label className="text-sm font-black">管理メモ</label>
        <textarea rows={3} className={input + " mt-2"} value={memo} onChange={(e) => setMemo(e.target.value)} />
        {booking.requestNote && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[#f7f1df] p-2 text-xs"><b>お客様備考</b>\n{booking.requestNote}</p>}
      </section>
      <button disabled={saving || booking.status === "cancelled"} onClick={save} className={button + " w-full bg-[#bfe3d1] disabled:opacity-50"}>
        {saving ? "保存中…" : "ステータス・メモ・参考音源を保存"}
      </button>
      {feedback && <p role="status" className="text-xs font-bold">{feedback}</p>}
      <p className="text-xs text-black/45">プラン・料金・素材URL・納期の編集は「詳細」から行えます。</p>
    </div>
  );
}

export default function ScheduleAdminPage() {
  const [today] = useState(() => dateString(new Date()));
  const [anchor, setAnchor] = useState(today);
  const [view, setView] = useState<View>("month");
  const [days, setDays] = useState<ScheduleDay[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([today]);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(30);
  const [eventTitle, setEventTitle] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const [schedule, bookingList, eventList] = await Promise.all([
      jsonFetch("/api/schedule"), jsonFetch("/api/bookings"), jsonFetch("/api/calendar-events"),
    ]);
    setDays(schedule.days ?? []);
    setBookings(bookingList.bookings ?? []);
    setEvents(eventList.events ?? []);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setMessage(e instanceof Error ? e.message : "読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, [refresh]);

  const scheduleMap = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => map.set(e.date, [...(map.get(e.date) ?? []), e]));
    return map;
  }, [events]);
  const selectedBooking = bookings.find((b) => b.id === bookingId) ?? null;
  const visibleDates = useMemo(() => {
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i));
    const d = parseDate(anchor);
    const first = dateString(new Date(d.getFullYear(), d.getMonth(), 1));
    const last = dateString(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return range(first, last);
  }, [view, anchor]);
  const offset = view === "month" ? parseDate(visibleDates[0]).getDay() : 0;
  const label = view === "month"
    ? `${parseDate(anchor).getFullYear()}年 ${parseDate(anchor).getMonth() + 1}月`
    : `${visibleDates[0].slice(5).replace("-", "/")} – ${visibleDates[6].slice(5).replace("-", "/")}`;
  const selectedDay = selectedDates.length === 1 ? scheduleMap.get(selectedDates[0]) : undefined;
  const todayWork = scheduleMap.get(today);
  function navigate(amount: number) {
    if (view === "week") setAnchor(addDays(anchor, amount * 7));
    else {
      const d = parseDate(anchor); d.setDate(1); d.setMonth(d.getMonth() + amount); setAnchor(dateString(d));
    }
    setSelectedDates([]);
    setBookingId(null);
  }
  function selectDay(date: string, shift = false) {
    setSelectedDates((prev) => shift && prev.length ? range(prev[0], date) : [date]);
    setBookingId(null);
  }
  async function updateCapacity(value: number) {
    if (!selectedDates.length) return;
    setMessage("");
    try {
      await jsonFetch("/api/schedule", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: selectedDates, capacity: value }),
      });
      await refresh();
      setMessage("キャパを保存しました");
    } catch (e) { setMessage(e instanceof Error ? e.message : "保存失敗"); }
  }
  async function postEvent(method: "POST" | "PATCH" | "DELETE", body: object) {
    try {
      await jsonFetch("/api/calendar-events", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      await refresh();
      setEventTitle(""); setEditingEventId(null); setEditingTitle("");
    } catch (e) { setMessage(e instanceof Error ? e.message : "予定を更新できませんでした"); }
  }

  return (
    <main className="min-h-screen bg-[#f7f1df] px-5 py-5 text-[#202020]">
      <div className="mx-auto max-w-[1900px]">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black tracking-[.18em]">WRAYMIX ADMIN</p>
            <h1 className="text-3xl font-black tracking-tight">SCHEDULE</h1>
          </div>
          <Link href="/admin/bookings/new" className={button + " bg-[#bfe3d1] px-5 py-3"}>＋ 予約を追加</Link>
        </header>
        <div className="grid grid-cols-[minmax(660px,1fr)_390px] items-start gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-black/20 bg-white px-4 py-2 text-xs">
              <span className="font-black">TODAY　{today.slice(5)}　{todayWork?.used ?? 0}/{todayWork?.capacity ?? 0}pt</span>
              <div className="flex flex-wrap justify-end gap-1">
                {(todayWork?.allocations ?? []).map((a) =>
                  <button key={a.id} onClick={() => { setSelectedDates([today]); setBookingId(a.booking.id); }} className="max-w-40 truncate rounded bg-[#dcd4f5] px-2 py-1 font-bold" title={a.booking.songTitle}>{a.booking.songTitle}</button>)}
              </div>
            </div>
            <section className="rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#202020]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(-1)} className={button}>←</button>
                  <h2 className="min-w-48 text-center text-lg font-black">{label}</h2>
                  <button onClick={() => navigate(1)} className={button}>→</button>
                  <button onClick={() => { setAnchor(today); setSelectedDates([today]); }} className={button + " bg-[#f7f1df]"}>TODAY</button>
                </div>
                <div className="flex rounded-lg border-2 border-black p-0.5">
                  {(["month", "week"] as const).map((v) =>
                    <button key={v} onClick={() => setView(v)} className={`rounded-md px-4 py-2 text-xs font-black ${view === v ? "bg-black text-white" : "bg-white"}`}>
                      {v === "month" ? "月" : "週"}
                    </button>)}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekdays.map((w, i) => <div key={w} className={`pb-1 text-center text-xs font-black ${i === 0 ? "text-red-700" : i === 6 ? "text-blue-700" : ""}`}>{w}</div>)}
                {Array.from({ length: offset }, (_, i) => <div key={`blank-${i}`} />)}
                {visibleDates.map((date) => {
                  const day = scheduleMap.get(date);
                  const allocations = day?.allocations ?? [];
                  const personal = eventMap.get(date) ?? [];
                  const selected = selectedDates.includes(date);
                  const isToday = date === today;
                  return (
                    <div key={date} className={`min-w-0 rounded-lg border p-1.5 ${view === "week" ? "min-h-80" : "min-h-30"} ${selected ? "border-black bg-[#eee9ff] ring-1 ring-black" : "border-black/15 bg-[#fffdf8]"} ${isToday ? "outline outline-2 outline-[#b897eb]" : ""}`}>
                      <button onClick={(e) => selectDay(date, e.shiftKey)} className="flex w-full items-center justify-between gap-1 text-left" title="クリックで日付選択、Shift+クリックで範囲選択">
                        <strong className="text-sm">{Number(date.slice(-2))}</strong>
                        <span className="text-[10px] font-bold text-black/55">{day ? `${day.used}/${day.capacity}pt` : "OFF"}</span>
                      </button>
                      {day && day.capacity > 0 && <div className="my-1 h-1 rounded-full bg-black/10"><div className="h-1 rounded-full bg-[#70b7a0]" style={{ width: `${Math.min(100, day.used / day.capacity * 100)}%` }} /></div>}
                      <div className="space-y-1">
                        {allocations.map((a) =>
                          <button key={a.id} onClick={() => { setSelectedDates([date]); setBookingId(a.booking.id); }}
                            title={`${a.booking.songTitle} / ${a.booking.name} / ${a.points}pt`}
                            className={`block w-full truncate rounded px-1 py-1 text-left text-[10px] font-bold leading-tight hover:ring-1 hover:ring-black ${bookingId === a.booking.id ? "ring-2 ring-black" : ""} ${pillColor(a.booking.status)}`}>
                            {a.booking.songTitle}<span className="ml-1 opacity-60">{a.points}pt</span>
                          </button>)}
                        {personal.map((e) => <button key={e.id} title={e.title} onClick={() => selectDay(date)} className="block w-full truncate rounded bg-[#eee] px-1 py-1 text-left text-[10px]">• {e.title}</button>)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-black/50">案件名をクリックして右側に詳細を表示。Shift＋日付クリックで複数日のキャパを一括変更できます。</p>
            </section>
            <section className="rounded-xl border border-black/20 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-black">日付・予定管理</h3><p className="text-xs text-black/50">{selectedDates.length ? `${selectedDates.length}日選択 / ${selectedDates[0]}` : "日付を選択してください"}</p></div>
                <div className="flex items-center gap-1">
                  {[0, 10, 20, 30].map((n) => <button key={n} disabled={!selectedDates.length} onClick={() => updateCapacity(n)} className={button + " disabled:opacity-40"}>{n ? `${n}pt` : "OFF"}</button>)}
                  <input type="number" min={0} className={input + " w-20"} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
                  <button disabled={!selectedDates.length} onClick={() => updateCapacity(capacity)} className={button + " bg-[#bfe3d1] disabled:opacity-40"}>適用</button>
                </div>
              </div>
              {selectedDates.length === 1 && <div className="mt-3 flex items-center gap-2">
                <input className={input} placeholder="個人予定を追加" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && eventTitle.trim()) postEvent("POST", { date: selectedDates[0], title: eventTitle.trim() }); }} />
                <button className={button} disabled={!eventTitle.trim()} onClick={() => postEvent("POST", { date: selectedDates[0], title: eventTitle.trim() })}>追加</button>
              </div>}
              {selectedDates.length === 1 && (eventMap.get(selectedDates[0]) ?? []).map((event) => (
                <div key={event.id} className="mt-2 flex items-center gap-2 rounded bg-[#f7f1df] p-2 text-xs">
                  {editingEventId === event.id ? <>
                    <input className={input} value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                    <button onClick={() => postEvent("PATCH", { id: event.id, title: editingTitle })} className={button}>保存</button>
                    <button onClick={() => setEditingEventId(null)}>戻る</button>
                  </> : <>
                    <span className="flex-1">{event.title}</span>
                    <button onClick={() => { setEditingEventId(event.id); setEditingTitle(event.title); }}>編集</button>
                    <button onClick={() => { if (window.confirm("予定を削除しますか？")) postEvent("DELETE", { id: event.id }); }}>削除</button>
                  </>}
                </div>
              ))}
              {message && <p role="status" className="mt-2 text-xs font-bold">{message}</p>}
            </section>
          </div>
          <aside className="sticky top-[76px] max-h-[calc(100vh-90px)] overflow-y-auto rounded-2xl border-2 border-black bg-white p-4 shadow-[3px_3px_0_#202020]">
            {selectedBooking ? <BookingPanel key={selectedBooking.id} booking={selectedBooking} onRefresh={refresh} /> : (
              <div>
                <p className="text-xs font-black tracking-widest text-black/50">BOOKING DETAILS</p>
                <h2 className="mt-2 text-xl font-black">依頼を選択</h2>
                <p className="mt-2 text-sm text-black/55">カレンダー上の案件名をクリックすると、ステータス・素材・参考音源リンクをここで確認できます。</p>
                {selectedDay && selectedDay.allocations.length > 0 && <div className="mt-4 space-y-2">
                  {selectedDay.allocations.map((a) =>
                    <button key={a.id} onClick={() => setBookingId(a.booking.id)} className="block w-full rounded-lg bg-[#f7f1df] p-3 text-left text-sm font-bold">{a.booking.songTitle} <span className="text-xs text-black/50">{a.points}pt</span></button>)}
                </div>}
              </div>
            )}
          </aside>
        </div>
        {loading && <p className="mt-3 text-xs">読み込み中…</p>}
      </div>
    </main>
  );
}
