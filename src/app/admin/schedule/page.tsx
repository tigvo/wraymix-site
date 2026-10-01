"use client";

import { useEffect, useMemo, useState } from "react";

type BookingAllocation = {
  date: string;
  points: number;
};

type Booking = {
  id: number;

  name: string;
  contact: string;
  songTitle: string;

  serviceType: string;
  singerCount: number;
  chorusCount: number;

  requestNote: string | null;

  costPoint: number;
  deliveryDate: string;

  status: string;

  planLabel: string | null;

  quotedPrice: number | null;

  adminNote: string | null;

  isExpress: boolean;

  allocations: BookingAllocation[];
};

type WorkAllocation = {
  id: number;
  date: string;
  points: number;
  booking: Booking;
};

type ScheduleDay = {
  id: number;
  date: string;
  capacity: number;
  bookable: boolean;
  used: number;

  allocations: WorkAllocation[];
};

type CalendarEvent = {
  id: number;
  date: string;
  title: string;
};

const statusOptions = [
  {
    value: "pending_review",
    label: "確認待ち",
  },
  {
    value: "reserved",
    label: "受付確定",
  },
  {
    value: "mixing",
    label: "MIX中",
  },
  {
    value: "first_draft",
    label: "初稿提出",
  },
  {
    value: "revision",
    label: "修正中",
  },
  {
    value: "delivered",
    label: "納品済み",
  },
];

function getStatusLabel(status: string) {
  if (status === "cancelled") {
    return "キャンセル";
  }

  return statusOptions.find((item) => item.value === status)?.label ?? status;
}

function formatDate(year: number, month: number, day: number) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function parseDateString(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function dateToString(date: Date) {
  return formatDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMonthDays(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from(
    {
      length: lastDay,
    },
    (_, index) => formatDate(year, month, index + 1),
  );
}

function getDateRange(start: string, end: string) {
  const [first, last] = [start, end].sort();

  const startDate = parseDateString(first);

  const endDate = parseDateString(last);

  const result: string[] = [];

  const current = new Date(startDate);

  while (current <= endDate) {
    result.push(dateToString(current));

    current.setDate(current.getDate() + 1);
  }

  return result;
}

async function fetchSchedule(): Promise<ScheduleDay[]> {
  const response = await fetch("/api/schedule");

  if (!response.ok) {
    throw new Error("schedule error");
  }

  const data = await response.json();

  return data.days ?? [];
}

async function fetchEvents(): Promise<CalendarEvent[]> {
  const response = await fetch("/api/calendar-events");

  if (!response.ok) {
    throw new Error("events error");
  }

  const data = await response.json();

  return data.events ?? [];
}

function BookingEditor({
  booking,
  onReload,
  onClose,
}: {
  booking: Booking;

  onReload: () => Promise<void>;

  onClose: () => void;
}) {
  const [planLabel, setPlanLabel] = useState(booking.planLabel ?? "");

  const [quotedPrice, setQuotedPrice] = useState(booking.quotedPrice ?? 0);

  const [costPoint, setCostPoint] = useState(booking.costPoint);

  const [deliveryDate, setDeliveryDate] = useState(booking.deliveryDate);

  const [adminNote, setAdminNote] = useState(booking.adminNote ?? "");

  const [isSaving, setIsSaving] = useState(false);

  async function patchBooking(values: Record<string, unknown>) {
    const response = await fetch("/api/bookings", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id: booking.id,

        ...values,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error ?? "案件の更新に失敗しました。");

      return false;
    }

    await onReload();

    return true;
  }

  async function save() {
    setIsSaving(true);

    try {
      await patchBooking({
        planLabel,
        quotedPrice,
        costPoint,
        deliveryDate,
        adminNote,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(status: string) {
    await patchBooking({
      status,
    });
  }

  async function confirmBooking() {
    const saved = await patchBooking({
      planLabel,
      quotedPrice,
      costPoint,
      deliveryDate,
      adminNote,
      status: "reserved",
    });

    if (saved) {
      alert("受付確定しました。");
    }
  }

  async function cancelBooking() {
    const ok = window.confirm(
      `${booking.name}さん「${booking.songTitle}」をキャンセルしますか？\n\n作業割当の履歴は残りますが、キャパ計算からは除外されます。`,
    );

    if (!ok) {
      return;
    }

    const success = await patchBooking({
      status: "cancelled",
    });

    if (success) {
      onClose();
    }
  }

  return (
    <div className="wray-event-editor">
      <p className="wray-admin-label">BOOKING</p>

      <h3
        style={{
          marginTop: 4,
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {booking.songTitle}
      </h3>

      <div
        style={{
          marginTop: 14,
          lineHeight: 1.9,
        }}
      >
        <div>
          <strong>依頼者：</strong>
          {booking.name}
        </div>

        <div>
          <strong>連絡先：</strong>
          {booking.contact}
        </div>

        <div>
          <strong>申請コース：</strong>
          {booking.serviceType === "full" ? "フルコーラス" : "short"}
        </div>

        <div>
          <strong>歌唱人数：</strong>
          {booking.singerCount}人
        </div>

        <div>
          <strong>コーラス：</strong>
          {booking.chorusCount}本
        </div>

        {booking.isExpress && (
          <div>
            <strong>⚡ 即日依頼</strong>
          </div>
        )}

        {booking.requestNote && (
          <div
            style={{
              marginTop: 12,
            }}
          >
            <strong>お客様備考</strong>

            <div
              style={{
                marginTop: 4,
                whiteSpace: "pre-wrap",
              }}
            >
              {booking.requestNote}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          marginTop: 24,
        }}
      >
        <label>
          <strong>最終プラン名</strong>

          <input
            value={planLabel}
            onChange={(event) => setPlanLabel(event.target.value)}
            placeholder="例：short+ / 特殊プラン"
            className="wray-calendar-input"
            style={{
              marginTop: 6,
            }}
          />
        </label>

        <label>
          <strong>最終料金</strong>

          <input
            type="number"
            min="0"
            value={quotedPrice}
            onChange={(event) => setQuotedPrice(Number(event.target.value))}
            className="wray-calendar-input"
            style={{
              marginTop: 6,
            }}
          />
        </label>

        <label>
          <strong>作業量</strong>

          <input
            type="number"
            min="1"
            value={costPoint}
            onChange={(event) => setCostPoint(Number(event.target.value))}
            className="wray-calendar-input"
            style={{
              marginTop: 6,
            }}
          />

          <small>変更すると作業割当を自動で組み直します。</small>
        </label>

        <label>
          <strong>納期</strong>

          <input
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            className="wray-calendar-input"
            style={{
              marginTop: 6,
            }}
          />
        </label>

        <label>
          <strong>管理メモ</strong>

          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            rows={4}
            className="wray-calendar-input"
            style={{
              marginTop: 6,
              resize: "vertical",
            }}
            placeholder="例：shortより尺長め、コーラス2本分で計算"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={isSaving}
        onClick={save}
        className="wray-calendar-primary"
        style={{
          marginTop: 18,
        }}
      >
        {isSaving ? "保存中..." : "内容を保存"}
      </button>

      <div
        style={{
          marginTop: 26,
        }}
      >
        <strong>STATUS</strong>

        <select
          value={booking.status}
          onChange={(event) => changeStatus(event.target.value)}
          className="wray-calendar-input"
          style={{
            marginTop: 6,
          }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {booking.status === "pending_review" && (
        <button
          type="button"
          onClick={confirmBooking}
          className="wray-calendar-primary"
          style={{
            marginTop: 14,
            width: "100%",
          }}
        >
          この内容で受付確定
        </button>
      )}

      <div
        style={{
          marginTop: 24,
        }}
      >
        <strong>作業割当</strong>

        {booking.allocations.map((allocation) => (
          <div key={allocation.date} className="wray-event-item">
            <span>{allocation.date}</span>

            <strong>
              {allocation.points}
              pt
            </strong>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={cancelBooking}
        style={{
          marginTop: 22,
          border: "2px solid #202020",
          borderRadius: 10,
          background: "#fff",
          padding: "10px 14px",
          fontWeight: 900,
        }}
      >
        案件をキャンセル
      </button>
    </div>
  );
}

export default function ScheduleAdminPage() {
  const today = new Date();

  const todayString = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const [year, setYear] = useState(today.getFullYear());

  const [month, setMonth] = useState(today.getMonth());

  const [days, setDays] = useState<ScheduleDay[]>([]);

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );

  const [dragStart, setDragStart] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  const [capacity, setCapacity] = useState(30);

  const [eventTitle, setEventTitle] = useState("");

  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const [editingTitle, setEditingTitle] = useState("");

  async function reloadSchedule() {
    setDays(await fetchSchedule());
  }

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchSchedule(), fetchEvents()])
      .then(([fetchedDays, fetchedEvents]) => {
        if (cancelled) {
          return;
        }

        setDays(fetchedDays);

        setEvents(fetchedEvents);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, []);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  const firstWeekday = new Date(year, month, 1).getDay();

  const scheduleMap = useMemo(
    () => new Map(days.map((day) => [day.date, day])),
    [days],
  );

  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const values = map.get(event.date) ?? [];

      values.push(event);

      map.set(event.date, values);
    }

    return map;
  }, [events]);

  const bookingMap = useMemo(() => {
    const map = new Map<number, Booking>();

    for (const day of days) {
      for (const allocation of day.allocations) {
        map.set(allocation.booking.id, allocation.booking);
      }
    }

    return map;
  }, [days]);

  const selectedBooking = selectedBookingId
    ? (bookingMap.get(selectedBookingId) ?? null)
    : null;

  const selectedDay =
    selectedDates.length === 1 ? scheduleMap.get(selectedDates[0]) : undefined;

  const todayDay = scheduleMap.get(todayString);

  function clearEditing() {
    setEditingEventId(null);

    setEditingTitle("");
  }

  function selectDate(date: string) {
    setIsDragging(true);

    setDragStart(date);

    setSelectedDates([date]);

    setSelectedBookingId(null);

    clearEditing();
  }

  function pointerEnter(date: string) {
    if (!isDragging || !dragStart) {
      return;
    }

    setSelectedDates(getDateRange(dragStart, date));

    setSelectedBookingId(null);
  }

  function pointerUp() {
    setIsDragging(false);

    setDragStart(null);
  }

  async function updateSchedule(values: Record<string, unknown>) {
    if (selectedDates.length === 0) {
      return;
    }

    const response = await fetch("/api/schedule", {
      method: "PUT",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        dates: selectedDates,

        ...values,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error ?? "更新失敗");

      return;
    }

    await reloadSchedule();
  }

  async function addEvent() {
    if (selectedDates.length !== 1 || !eventTitle.trim()) {
      return;
    }

    const response = await fetch("/api/calendar-events", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        date: selectedDates[0],

        title: eventTitle.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return;
    }

    setEvents((current) => [...current, data.event]);

    setEventTitle("");
  }

  async function updateEvent() {
    if (editingEventId === null || !editingTitle.trim()) {
      return;
    }

    const response = await fetch("/api/calendar-events", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id: editingEventId,

        title: editingTitle.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return;
    }

    setEvents((current) =>
      current.map((event) =>
        event.id === editingEventId ? data.event : event,
      ),
    );

    clearEditing();
  }

  async function deleteEvent(id: number) {
    await fetch("/api/calendar-events", {
      method: "DELETE",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        id,
      }),
    });

    setEvents((current) => current.filter((event) => event.id !== id));
  }

  return (
    <main
      className="wray-calendar-page"
      onPointerUp={pointerUp}
      onPointerLeave={pointerUp}
    >
      <div className="wray-calendar-container">
        <header>
          <p className="wray-admin-label">WRAYMIX ADMIN</p>

          <h1 className="wray-admin-title">SCHEDULE</h1>
        </header>

        <section
          className="wray-calendar-card"
          style={{
            background: "#bfe3d1",
          }}
        >
          <p className="wray-admin-label">TODAY&apos;S WORK</p>

          <h2
            style={{
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            今日の作業
          </h2>

          {(todayDay?.allocations ?? []).length === 0 ? (
            <p
              style={{
                marginTop: 12,
              }}
            >
              今日のMIX作業はありません。
            </p>
          ) : (
            todayDay?.allocations.map((allocation) => (
              <button
                key={allocation.id}
                type="button"
                className="wray-event-item"
                style={{
                  width: "100%",
                  textAlign: "left",
                }}
                onClick={() => {
                  setSelectedDates([todayString]);

                  setSelectedBookingId(allocation.booking.id);
                }}
              >
                <span>
                  <strong>{allocation.booking.songTitle}</strong>

                  {" / "}

                  {allocation.booking.name}

                  {" / "}

                  {getStatusLabel(allocation.booking.status)}
                </span>

                <strong>
                  {allocation.points}
                  pt
                </strong>
              </button>
            ))
          )}

          <p
            style={{
              marginTop: 14,
              fontWeight: 900,
            }}
          >
            {todayDay?.used ?? 0}
            {" / "}
            {todayDay?.capacity ?? 0}
            pt
          </p>
        </section>

        <section className="wray-calendar-card">
          <div className="wray-calendar-month-header">
            <button
              type="button"
              className="wray-calendar-arrow"
              onClick={() => {
                if (month === 0) {
                  setYear(year - 1);
                  setMonth(11);
                } else {
                  setMonth(month - 1);
                }

                setSelectedDates([]);
              }}
            >
              ←
            </button>

            <div className="wray-calendar-month">
              <h2>
                {year}年 {month + 1}月
              </h2>

              <button
                className="wray-calendar-today-button"
                onClick={() => {
                  const now = new Date();

                  setYear(now.getFullYear());

                  setMonth(now.getMonth());

                  setSelectedDates([todayString]);
                }}
              >
                TODAY
              </button>
            </div>

            <button
              type="button"
              className="wray-calendar-arrow"
              onClick={() => {
                if (month === 11) {
                  setYear(year + 1);
                  setMonth(0);
                } else {
                  setMonth(month + 1);
                }

                setSelectedDates([]);
              }}
            >
              →
            </button>
          </div>

          <div className="wray-calendar-weekdays">
            <div>SUN</div>
            <div>MON</div>
            <div>TUE</div>
            <div>WED</div>
            <div>THU</div>
            <div>FRI</div>
            <div>SAT</div>
          </div>

          <div className="wray-calendar-grid">
            {Array.from({
              length: firstWeekday,
            }).map((_, index) => (
              <div
                key={index}
                className="wray-calendar-day"
                style={{
                  visibility: "hidden",
                }}
              />
            ))}

            {monthDays.map((date) => {
              const day = scheduleMap.get(date);

              const selected = selectedDates.includes(date);

              const dateEvents = eventsMap.get(date) ?? [];

              const percentage =
                day && day.capacity > 0
                  ? Math.min((day.used / day.capacity) * 100, 100)
                  : 0;

              return (
                <button
                  key={date}
                  type="button"
                  className={[
                    "wray-calendar-day",

                    selected ? "wray-calendar-day-selected" : "",

                    date === todayString ? "wray-calendar-day-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onPointerDown={() => selectDate(date)}
                  onPointerEnter={() => pointerEnter(date)}
                >
                  <span className="wray-calendar-date-number">
                    {Number(date.slice(-2))}
                  </span>

                  {day && day.capacity > 0 && (
                    <>
                      <div className="wray-calendar-capacity">
                        {day.used} / {day.capacity}pt
                      </div>

                      <div className="wray-calendar-bar">
                        <div
                          className="wray-calendar-bar-inner"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </>
                  )}

                  {(day?.allocations ?? []).slice(0, 2).map((allocation) => (
                    <div
                      key={allocation.id}
                      className="wray-calendar-event"
                      style={{
                        marginTop: 4,

                        background:
                          allocation.booking.status === "pending_review"
                            ? "#f5d48d"
                            : "#ffffff",
                      }}
                    >
                      {allocation.booking.status === "pending_review"
                        ? "確認待ち "
                        : ""}
                      {allocation.booking.songTitle} {allocation.points}
                      pt
                    </div>
                  ))}

                  {dateEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="wray-calendar-event">
                      {event.title}
                    </div>
                  ))}
                  {dateEvents.length > 2 && (
                    <div className="wray-calendar-more">
                      +{dateEvents.length - 2}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="wray-calendar-editor">
          {selectedDates.length === 0 ? (
            <h2 className="wray-calendar-editor-title">SELECT DATE</h2>
          ) : (
            <>
              <p className="wray-admin-label">SELECTED</p>

              <h2 className="wray-calendar-editor-title">
                {selectedDates.length}
                日選択中
              </h2>

              <div
                style={{
                  marginTop: 24,
                }}
              >
                <p className="wray-admin-label">CAPACITY</p>

                <div className="wray-calendar-preset-grid">
                  {[0, 10, 20, 30].map((value) => (
                    <button
                      key={value}
                      className="wray-calendar-preset"
                      onClick={() =>
                        updateSchedule({
                          capacity: value,
                        })
                      }
                    >
                      {value === 0 ? "OFF" : `${value}pt`}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    value={capacity}
                    onChange={(event) =>
                      setCapacity(Number(event.target.value))
                    }
                    className="wray-calendar-input"
                  />

                  <button
                    className="wray-calendar-primary"
                    onClick={() =>
                      updateSchedule({
                        capacity,
                      })
                    }
                  >
                    APPLY
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <button
                    className="wray-calendar-preset"
                    onClick={() =>
                      updateSchedule({
                        bookable: true,
                      })
                    }
                  >
                    納品受付 ON
                  </button>

                  <button
                    className="wray-calendar-preset"
                    onClick={() =>
                      updateSchedule({
                        bookable: false,
                      })
                    }
                  >
                    納品受付 OFF
                  </button>
                </div>
              </div>

              {selectedDates.length === 1 && (
                <>
                  <div className="wray-event-editor">
                    <p className="wray-admin-label">MIX WORK</p>

                    {(selectedDay?.allocations ?? []).length === 0 ? (
                      <p>MIX作業なし</p>
                    ) : (
                      selectedDay?.allocations.map((allocation) => (
                        <button
                          key={allocation.id}
                          type="button"
                          className="wray-event-item"
                          style={{
                            width: "100%",
                            textAlign: "left",
                          }}
                          onClick={() =>
                            setSelectedBookingId(allocation.booking.id)
                          }
                        >
                          <span>
                            <strong>{allocation.booking.songTitle}</strong>

                            <br />

                            <small>
                              {allocation.booking.name}
                              さん / {getStatusLabel(allocation.booking.status)}
                            </small>
                          </span>

                          <strong>
                            {allocation.points}
                            pt
                          </strong>
                        </button>
                      ))
                    )}
                  </div>

                  {selectedBooking && (
                    <BookingEditor
                      key={`${selectedBooking.id}-${selectedBooking.costPoint}-${selectedBooking.deliveryDate}-${selectedBooking.status}-${selectedBooking.quotedPrice}`}
                      booking={selectedBooking}
                      onReload={reloadSchedule}
                      onClose={() => setSelectedBookingId(null)}
                    />
                  )}

                  <div className="wray-event-editor">
                    <p className="wray-admin-label">EVENT</p>

                    <h3
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                      }}
                    >
                      個人予定
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <input
                        value={eventTitle}
                        onChange={(event) => setEventTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            addEvent();
                          }
                        }}
                        className="wray-calendar-input"
                      />

                      <button
                        className="wray-calendar-primary"
                        onClick={addEvent}
                      >
                        ADD
                      </button>
                    </div>

                    {(eventsMap.get(selectedDates[0]) ?? []).map((event) => (
                      <div key={event.id} className="wray-event-item">
                        {editingEventId === event.id ? (
                          <>
                            <input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateEvent();
                                }
                              }}
                              className="wray-calendar-input"
                            />

                            <button
                              className="wray-calendar-primary"
                              onClick={updateEvent}
                            >
                              SAVE
                            </button>
                          </>
                        ) : (
                          <>
                            <span>{event.title}</span>

                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                              }}
                            >
                              <button
                                onClick={() => {
                                  setEditingEventId(event.id);

                                  setEditingTitle(event.title);
                                }}
                              >
                                EDIT
                              </button>

                              <button onClick={() => deleteEvent(event.id)}>
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
