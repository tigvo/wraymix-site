"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

type BookingAdminControlsProps = {
  bookingId: number;

  initialStatus: string;

  initialPlanLabel: string | null;

  initialQuotedPrice: number | null;

  initialCostPoint: number;

  initialDeliveryDate: string;

  initialAdminNote: string | null;

  clientProjectPath: string;
};

const statuses = [
  {
    value: "pending_review",
    label: "内容確認中",
  },
  {
    value: "reserved",
    label: "受付確定",
  },
  {
    value: "mixing",
    label: "MIX制作中",
  },
  {
    value: "first_draft",
    label: "初稿提出済み",
  },
  {
    value: "revision",
    label: "修正対応中",
  },
  {
    value: "delivered",
    label: "納品完了",
  },
  {
    value: "cancelled",
    label: "キャンセル",
  },
];

export default function BookingAdminControls({
  bookingId,
  initialStatus,
  initialPlanLabel,
  initialQuotedPrice,
  initialCostPoint,
  initialDeliveryDate,
  initialAdminNote,
  clientProjectPath,
}: BookingAdminControlsProps) {
  const router = useRouter();

  const [status, setStatus] = useState(initialStatus);

  const [planLabel, setPlanLabel] = useState(initialPlanLabel ?? "");

  const [quotedPrice, setQuotedPrice] = useState(
    initialQuotedPrice?.toString() ?? "",
  );

  const [costPoint, setCostPoint] = useState(String(initialCostPoint));

  const [deliveryDate, setDeliveryDate] = useState(initialDeliveryDate);

  const [adminNote, setAdminNote] = useState(initialAdminNote ?? "");

  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");

  async function save() {
    const parsedCostPoint = Number(costPoint);

    if (!Number.isFinite(parsedCostPoint) || parsedCostPoint <= 0) {
      setMessage("作業ptを確認してください。");

      return;
    }

    const parsedPrice = quotedPrice.trim() === "" ? null : Number(quotedPrice);

    if (
      parsedPrice !== null &&
      (!Number.isFinite(parsedPrice) || parsedPrice < 0)
    ) {
      setMessage("料金を確認してください。");

      return;
    }

    setIsSaving(true);

    setMessage("");

    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: bookingId,

          status,

          planLabel: planLabel.trim() || null,

          quotedPrice: parsedPrice,

          costPoint: parsedCostPoint,

          deliveryDate,

          adminNote: adminNote.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "更新に失敗しました。");

        return;
      }

      setMessage("保存しました。");

      router.refresh();
    } catch (error) {
      console.error(error);

      setMessage("通信エラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  }

  async function copyClientLink() {
    const fullUrl = `${window.location.origin}${clientProjectPath}`;

    await navigator.clipboard.writeText(fullUrl);

    setMessage("顧客ページURLをコピーしました。");
  }

  return (
    <section className="mt-6 rounded-3xl border-2 border-black bg-[#f5d48d] p-6 shadow-[5px_5px_0_#202020]">
      <p className="text-xs font-black tracking-[0.18em]">ADMIN CONTROL</p>

      <h2 className="mt-1 text-2xl font-black">案件管理</h2>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* STATUS */}

        <label className="block">
          <span className="text-sm font-black">ステータス</span>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 w-full rounded-xl border-2 border-black bg-white p-3 font-bold"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {/* PLAN */}

        <label className="block">
          <span className="text-sm font-black">確定プラン名</span>

          <input
            value={planLabel}
            onChange={(event) => setPlanLabel(event.target.value)}
            placeholder="例：フルコーラス"
            className="mt-2 w-full rounded-xl border-2 border-black bg-white p-3"
          />
        </label>

        {/* PRICE */}

        <label className="block">
          <span className="text-sm font-black">確定料金</span>

          <div className="mt-2 flex items-center gap-2">
            <span className="font-black">¥</span>

            <input
              type="number"
              min="0"
              value={quotedPrice}
              onChange={(event) => setQuotedPrice(event.target.value)}
              placeholder="6500"
              className="w-full rounded-xl border-2 border-black bg-white p-3 font-black"
            />
          </div>

          <p className="mt-2 text-xs text-black/50">
            空欄の場合、顧客ページには「内容確認後に確定」と表示されます。
          </p>
        </label>

        {/* POINT */}

        <label className="block">
          <span className="text-sm font-black">作業量</span>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={costPoint}
              onChange={(event) => setCostPoint(event.target.value)}
              className="w-full rounded-xl border-2 border-black bg-white p-3 font-black"
            />

            <span className="font-black">pt</span>
          </div>
        </label>

        {/* DELIVERY */}

        <label className="block md:col-span-2">
          <span className="text-sm font-black">初稿お渡し予定日</span>

          <input
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            className="mt-2 w-full rounded-xl border-2 border-black bg-white p-3 font-black md:max-w-xs"
          />

          <p className="mt-2 text-xs leading-5 text-black/50">
            初稿日または作業量を変更すると、作業割当も再計算されます。
          </p>
        </label>

        {/* ADMIN NOTE */}

        <label className="block md:col-span-2">
          <span className="text-sm font-black">管理メモ</span>

          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            rows={5}
            placeholder="自分だけが見るメモ"
            className="mt-2 w-full resize-y rounded-xl border-2 border-black bg-white p-3"
          />

          <p className="mt-2 text-xs text-black/50">
            この内容は顧客ページには表示されません。
          </p>
        </label>
      </div>

      {/* CLIENT PAGE */}

      <div className="mt-6 rounded-2xl border-2 border-black bg-white/60 p-4">
        <p className="text-xs font-black tracking-[0.15em]">
          CLIENT PROJECT PAGE
        </p>

        <p className="mt-2 break-all text-xs text-black/60">
          {clientProjectPath}
        </p>

        <button
          type="button"
          onClick={copyClientLink}
          className="mt-3 rounded-xl border-2 border-black bg-white px-4 py-2 text-xs font-black"
        >
          顧客ページURLをコピー
        </button>
      </div>

      {message && (
        <div className="mt-5 rounded-xl border-2 border-black bg-white p-3 text-sm font-bold">
          {message}
        </div>
      )}

      <button
        type="button"
        disabled={isSaving}
        onClick={save}
        className="mt-6 w-full rounded-xl border-2 border-black bg-black px-5 py-4 font-black text-white shadow-[4px_4px_0_#dcd4f5] disabled:opacity-40"
      >
        {isSaving ? "保存中..." : "変更を保存"}
      </button>
    </section>
  );
}
