"use client";

import { useState } from "react";

import {
  ServiceType,
  getBookingCost,
  getAvailabilityStatus,
  getAvailabilityLabel,
} from "@/lib/booking";

import { schedule } from "@/lib/mockSchedule";

export default function Home() {
  const [service, setService] = useState<ServiceType>("full");
  const [singers, setSingers] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const requiredCost = getBookingCost(service, singers);

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-gray-900">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold">MIX ご予約</h1>

        <p className="mb-8 text-gray-600">
          ご依頼内容を選択すると、予約可能な納期が表示されます。
        </p>

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">ご依頼内容</h2>

          <div className="mb-6">
            <label className="mb-2 block font-medium">コース</label>

            <select
              value={service}
              onChange={(event) => {
                setService(event.target.value as ServiceType);

                setSelectedDate(null);
              }}
              className="w-full rounded-lg border border-gray-300 p-3"
            >
              <option value="full">フルコーラス</option>

              <option value="short">short</option>
            </select>
          </div>

          {service === "full" && (
            <div>
              <label className="mb-2 block font-medium">歌唱人数</label>

              <div className="flex gap-2">
                {[1, 2, 3, 4].map((number) => (
                  <button
                    key={number}
                    type="button"
                    onClick={() => {
                      setSingers(number);
                      setSelectedDate(null);
                    }}
                    className={`rounded-lg border px-4 py-2 ${
                      singers === number
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {number === 4 ? "4人以上" : `${number}人`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold">ご予約可能な納期</h2>

          <div className="space-y-3">
            {schedule.map((day) => {
              const status = getAvailabilityStatus(
                day.capacity,
                day.used,
                requiredCost,
              );

              const label = getAvailabilityLabel(status);

              const selectable = status !== "full";

              return (
                <button
                  key={day.date}
                  type="button"
                  disabled={!selectable}
                  onClick={() => setSelectedDate(day.date)}
                  className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${
                    selectedDate === day.date
                      ? "border-black bg-gray-100"
                      : "border-gray-200"
                  } ${
                    selectable
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-40"
                  }`}
                >
                  <span className="font-medium">{formatDate(day.date)}</span>

                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {selectedDate && (
          <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">ご予約内容</h2>

            <p>
              コース：
              {service === "full" ? "フルコーラス" : "short"}
            </p>

            {service === "full" && <p>歌唱人数：{singers}人</p>}

            <p>希望納期：{formatDate(selectedDate)}</p>

            <button
              type="button"
              className="mt-6 w-full rounded-lg bg-black px-4 py-3 font-bold text-white"
            >
              この日程で依頼する
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return `${date.getMonth() + 1}/${date.getDate()}`;
}
