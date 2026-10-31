"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBasePrice, getBookingCost, getServiceLabel, type ServiceType } from "@/lib/booking";

type FormState = {
  name: string; source: string; contact: string; songTitle: string;
  service: ServiceType; singerCount: number; chorusCount: number;
  planLabel: string; quotedPrice: number; costPoint: number; deliveryDate: string;
  materialLinks: string; requestNote: string; paymentMethod: string;
};
const initial: FormState = {
  name: "", source: "XのDM", contact: "", songTitle: "", service: "full", singerCount: 1,
  chorusCount: 0, planLabel: "フルコーラス", quotedPrice: 6500, costPoint: 10,
  deliveryDate: "", materialLinks: "", requestNote: "", paymentMethod: "",
};
const field = "w-full rounded-xl border-2 border-black bg-white px-3 py-3 outline-offset-2";
const heading = "mb-1 block text-sm font-black";

export default function AdminNewBookingPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((old) => ({ ...old, [key]: value }));

  function changeService(service: ServiceType, singerCount: number) {
    setForm((old) => ({
      ...old, service, singerCount,
      planLabel: getServiceLabel(service),
      quotedPrice: getBasePrice(service),
      costPoint: getBookingCost(service, singerCount),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "登録に失敗しました。");
        return;
      }
      router.push(`/admin/bookings/${data.booking.id}`);
      router.refresh();
    } catch {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1df] px-4 py-8 text-[#202020] md:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/bookings" className="text-sm font-bold underline">← BOOKINGSに戻る</Link>
        <p className="mt-6 text-xs font-black tracking-[0.2em]">WRAYMIX ADMIN</p>
        <h1 className="text-4xl font-black md:text-6xl">NEW BOOKING</h1>
        <p className="mt-2 text-sm text-black/60">
          DM・メールなどで直接受けた依頼を登録します。登録後は受付確定になり、作業枠に反映されます。
        </p>
        <form onSubmit={submit} className="mt-7 space-y-5 rounded-2xl border-2 border-black bg-white p-5 shadow-[4px_4px_0_#202020] md:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={heading}>依頼者名 *</span>
              <input required className={field} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
            <label><span className={heading}>受付経路</span>
              <select className={field} value={form.source} onChange={(e) => set("source", e.target.value)}>
                <option>XのDM</option><option>メール</option><option>Discord</option><option>その他</option>
              </select></label>
          </div>
          <label className="block"><span className={heading}>連絡先・アカウント（任意）</span>
            <input className={field} value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="@account / メールアドレスなど" /></label>
          <label className="block"><span className={heading}>曲名 *</span>
            <input required className={field} value={form.songTitle} onChange={(e) => set("songTitle", e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={heading}>コース</span>
              <select className={field} value={form.service} onChange={(e) => changeService(e.target.value as ServiceType, form.singerCount)}>
                <option value="full">フルコーラス</option><option value="one_chorus">ワンコーラス</option><option value="short">short</option>
              </select></label>
            <label><span className={heading}>歌唱人数</span>
              <input type="number" min={1} max={100} required className={field} value={form.singerCount}
                onChange={(e) => changeService(form.service, Number(e.target.value))} /></label>
            <label><span className={heading}>コーラス本数</span>
              <input type="number" min={0} required className={field} value={form.chorusCount}
                onChange={(e) => set("chorusCount", Number(e.target.value))} /></label>
          </div>
          <label className="block"><span className={heading}>表示プラン名</span>
            <input className={field} value={form.planLabel} onChange={(e) => set("planLabel", e.target.value)} placeholder="特殊プランなど" /></label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={heading}>確定料金（円）*</span>
              <input type="number" min={0} required className={field} value={form.quotedPrice}
                onChange={(e) => set("quotedPrice", Number(e.target.value))} /></label>
            <label><span className={heading}>作業量（pt）*</span>
              <input type="number" min={1} required className={field} value={form.costPoint}
                onChange={(e) => set("costPoint", Number(e.target.value))} /></label>
            <label><span className={heading}>初稿予定日 *</span>
              <input type="date" required className={field} value={form.deliveryDate}
                onChange={(e) => set("deliveryDate", e.target.value)} /></label>
          </div>
          <p className="text-xs text-black/55">料金と作業量はコースから自動設定。特殊案件は直接変更できます。納期は既存のスケジュール枠内で判定します。</p>
          <label className="block"><span className={heading}>支払い方法（任意）</span>
            <select className={field} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
              <option value="">未設定</option><option value="bank_transfer">銀行振込</option>
              <option value="credit_card">クレジットカード</option><option value="other">その他</option>
            </select></label>
          <label className="block"><span className={heading}>素材URL（任意・複数行可）</span>
            <textarea rows={2} className={field} value={form.materialLinks}
              onChange={(e) => set("materialLinks", e.target.value)} /></label>
          <label className="block"><span className={heading}>管理メモ（任意）</span>
            <textarea rows={3} className={field} value={form.requestNote}
              onChange={(e) => set("requestNote", e.target.value)} placeholder="DMで合意した内容など" /></label>
          {error && <p role="alert" className="rounded-lg bg-red-100 p-3 font-bold text-red-700">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-xl border-2 border-black bg-[#bfe3d1] p-4 font-black disabled:opacity-50">
            {saving ? "登録中..." : "受付確定で登録する"}
          </button>
        </form>
      </div>
    </main>
  );
}
