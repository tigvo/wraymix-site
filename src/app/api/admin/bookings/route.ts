import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { getTodayInJapan } from "@/lib/japanDate";
import { buildAllocationPlan, shiftDate } from "@/lib/allocation";
import { bookingConsumesCapacity, getServiceLabel, type ServiceType } from "@/lib/booking";

const validServices = ["full", "one_chorus", "short"] as const;

export async function POST(request: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const songTitle = typeof body.songTitle === "string" ? body.songTitle.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const source = typeof body.source === "string" ? body.source.trim() : "";
    const service = body.service as ServiceType;
    const deliveryDate = typeof body.deliveryDate === "string" ? body.deliveryDate : "";
    const singerCount = Number(body.singerCount);
    const chorusCount = Number(body.chorusCount);
    const costPoint = Number(body.costPoint);
    const quotedPrice = Number(body.quotedPrice);
    const requestNote = typeof body.requestNote === "string" ? body.requestNote.trim() : "";
    const rawLinks = typeof body.materialLinks === "string" ? body.materialLinks.trim() : "";
    const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : "";

    if (!name || !songTitle || !validServices.includes(service) ||
      !Number.isInteger(singerCount) || singerCount < 1 || singerCount > 100 ||
      !Number.isInteger(chorusCount) || chorusCount < 0 ||
      !Number.isInteger(costPoint) || costPoint < 1 ||
      !Number.isSafeInteger(quotedPrice) || quotedPrice < 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) ||
      !["", "bank_transfer", "credit_card", "other"].includes(paymentMethod)) {
      return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
    }

    const [y, m, d] = deliveryDate.split("-").map(Number);
    if (new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) !== deliveryDate ||
        deliveryDate < getTodayInJapan()) {
      return NextResponse.json({ error: "納期は今日以降の正しい日付を指定してください。" }, { status: 400 });
    }

    const links = rawLinks.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
    for (const link of links) {
      try {
        const u = new URL(link);
        if (!["http:", "https:"].includes(u.protocol)) throw new Error();
      } catch {
        return NextResponse.json({ error: "素材URLはhttp(s)から始まるURLを指定してください。" }, { status: 400 });
      }
    }

    const note = [source ? `受付経路: ${source}` : "", requestNote].filter(Boolean).join("\n");
    const today = getTodayInJapan();
    const sevenDaysBefore = shiftDate(deliveryDate, -7);
    const startDate = sevenDaysBefore < today ? today : sevenDaysBefore;

    const booking = await prisma.$transaction(async (tx) => {
      const days = await tx.scheduleDay.findMany({
        where: { date: { gte: startDate, lte: deliveryDate } },
        include: { allocations: { include: { booking: { select: { status: true } } } } },
        orderBy: { date: "desc" },
      });
      const deliveryDay = days.find((day) => day.date === deliveryDate);
      if (!deliveryDay || deliveryDay.capacity <= 0) throw new Error("DATE_NOT_AVAILABLE");

      const plan = buildAllocationPlan(days.map((day) => ({
        date: day.date,
        capacity: day.capacity,
        used: day.allocations.reduce(
          (sum, a) => sum + (bookingConsumesCapacity(a.booking.status) ? a.points : 0), 0
        ),
      })), costPoint);
      if (!plan) throw new Error("BOOKING_CAPACITY_EXCEEDED");

      const record = await tx.booking.create({
        data: {
          name,
          contact: contact || (source ? `未登録（${source}）` : "未登録（直接受付）"),
          songTitle,
          serviceType: service,
          singerCount,
          chorusCount,
          costPoint,
          deliveryDate,
          status: "reserved",
          planLabel: typeof body.planLabel === "string" && body.planLabel.trim()
            ? body.planLabel.trim() : getServiceLabel(service),
          quotedPrice,
          requestNote: null,
          adminNote: note || null,
          materialLinks: links.join("\n") || null,
          paymentMethod: paymentMethod || null,
          isExpress: false,
        },
      });
      await tx.workAllocation.createMany({
        data: plan.map((p) => ({ bookingId: record.id, date: p.date, points: p.points }))
      });
      return record;
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("管理者予約登録エラー", error);
    if (error instanceof Error && error.message === "DATE_NOT_AVAILABLE")
      return NextResponse.json({ error: "指定した納期はスケジュール上受付不可です。" }, { status: 400 });
    if (error instanceof Error && error.message === "BOOKING_CAPACITY_EXCEEDED")
      return NextResponse.json({ error: "指定した納期までの空き作業量が不足しています。" }, { status: 409 });
    return NextResponse.json({ error: "登録に失敗しました。" }, { status: 500 });
  }
}
