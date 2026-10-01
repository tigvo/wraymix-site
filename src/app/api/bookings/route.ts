import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { buildAllocationPlan, shiftDate } from "@/lib/allocation";

import { getBasePrice, getBookingCost, type ServiceType } from "@/lib/booking";

import { getTodayInJapan, getTomorrowInJapan } from "@/lib/japanDate";

import { requireAdmin } from "@/lib/adminAuth";

import { createClientBookingPath } from "@/lib/clientBookingAccess";

const allowedStatuses = [
  "pending_review",
  "reserved",
  "mixing",
  "first_draft",
  "revision",
  "delivered",
  "cancelled",
] as const;

async function createAllocationPlan(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  bookingId: number | null,
  deliveryDate: string,
  requiredPoints: number,
) {
  const today = getTodayInJapan();
  const tomorrow = getTomorrowInJapan();

  if (deliveryDate < tomorrow) {
    throw new Error("SAME_DAY_NOT_ALLOWED");
  }

  const candidateStart = shiftDate(deliveryDate, -7);

  const startDate = candidateStart < today ? today : candidateStart;

  const scheduleDays = await tx.scheduleDay.findMany({
    where: {
      date: {
        gte: startDate,
        lte: deliveryDate,
      },
    },

    orderBy: {
      date: "desc",
    },

    include: {
      allocations: {
        include: {
          booking: {
            select: {
              status: true,
            },
          },
        },
      },
    },
  });

  const deliveryDay = scheduleDays.find((day) => day.date === deliveryDate);

  if (!deliveryDay || !deliveryDay.bookable || deliveryDay.capacity <= 0) {
    throw new Error("DATE_NOT_AVAILABLE");
  }

  const workDays = scheduleDays.map((day) => ({
    date: day.date,
    capacity: day.capacity,

    used: day.allocations.reduce((total, allocation) => {
      if (allocation.booking.status === "cancelled") {
        return total;
      }

      if (bookingId !== null && allocation.bookingId === bookingId) {
        return total;
      }

      return total + allocation.points;
    }, 0),
  }));

  const plan = buildAllocationPlan(workDays, requiredPoints);

  if (!plan) {
    throw new Error("BOOKING_CAPACITY_EXCEEDED");
  }

  return plan;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const paymentMethod =
      typeof body.paymentMethod === "string" ? body.paymentMethod : "";

    if (paymentMethod !== "bank_transfer" && paymentMethod !== "credit_card") {
      return NextResponse.json(
        {
          error: "支払い方法を選択してください。",
        },
        {
          status: 400,
        },
      );
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";

    const contact = typeof body.contact === "string" ? body.contact.trim() : "";

    const songTitle =
      typeof body.songTitle === "string" ? body.songTitle.trim() : "";

    const requestNote =
      typeof body.requestNote === "string" ? body.requestNote.trim() : "";

    const service = body.service;

    const singers = Number(body.singers);

    const chorusCount = Number(body.chorusCount ?? 0);

    const deliveryDate =
      typeof body.deliveryDate === "string" ? body.deliveryDate : "";

    const rawMaterialLinks =
      typeof body.materialLinks === "string" ? body.materialLinks : "";

    const materialLinksArray = rawMaterialLinks
      .split(/\r?\n/)
      .map((value: string) => value.trim())
      .filter(Boolean);

    for (const value of materialLinksArray) {
      try {
        const url = new URL(value);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error();
        }
      } catch {
        return NextResponse.json(
          {
            error: "素材URLに正しくないURLが含まれています。",
          },
          {
            status: 400,
          },
        );
      }
    }

    const materialLinks = materialLinksArray.join("\n");

    if (
      !name ||
      !contact ||
      !songTitle ||
      !deliveryDate ||
      (service !== "full" && service !== "short")
    ) {
      return NextResponse.json(
        {
          error: "入力内容が不正です。",
        },
        {
          status: 400,
        },
      );
    }

    const singerCount = Number.isInteger(singers) && singers >= 1 ? singers : 1;

    const safeChorusCount =
      Number.isInteger(chorusCount) && chorusCount >= 0 ? chorusCount : 0;

    const requiredCost = getBookingCost(service as ServiceType, singerCount);

    const tomorrow = getTomorrowInJapan();

    const dayAfterTomorrow = shiftDate(tomorrow, 1);

    const isExpress =
      deliveryDate === tomorrow || deliveryDate === dayAfterTomorrow;

    let provisionalPrice = getBasePrice(service as ServiceType);

    if (isExpress) {
      provisionalPrice = Math.round(provisionalPrice * 1.5);
    }

    const booking = await prisma.$transaction(async (tx) => {
      const allocationPlan = await createAllocationPlan(
        tx,
        null,
        deliveryDate,
        requiredCost,
      );

      const newBooking = await tx.booking.create({
        data: {
          name,
          contact,
          songTitle,

          serviceType: service,

          singerCount,

          chorusCount: safeChorusCount,

          requestNote: requestNote || null,

          costPoint: requiredCost,

          deliveryDate,

          status: "pending_review",

          planLabel: service === "full" ? "フルコーラス" : "short",

          quotedPrice: provisionalPrice,

          materialLinks: materialLinks || null,

          paymentMethod,

          isExpress,
        },
      });

      await tx.workAllocation.createMany({
        data: allocationPlan.map((allocation) => ({
          bookingId: newBooking.id,

          date: allocation.date,

          points: allocation.points,
        })),
      });

      return tx.booking.findUnique({
        where: {
          id: newBooking.id,
        },

        include: {
          allocations: {
            orderBy: {
              date: "asc",
            },
          },
        },
      });
    });
    if (!booking) {
      return NextResponse.json(
        {
          error: "予約の保存に失敗しました。",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      booking,
      clientProjectPath: createClientBookingPath(booking.id),
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "SAME_DAY_NOT_ALLOWED") {
      return NextResponse.json(
        {
          error: "当日のご依頼は受け付けていません。最短で翌日納品となります。",
        },
        {
          status: 400,
        },
      );
    }

    if (error instanceof Error && error.message === "PAST_DATE") {
      return NextResponse.json(
        {
          error: "過去の日付は選択できません。",
        },
        {
          status: 400,
        },
      );
    }

    if (error instanceof Error && error.message === "DATE_NOT_AVAILABLE") {
      return NextResponse.json(
        {
          error: "この日は受付できません。",
        },
        {
          status: 400,
        },
      );
    }

    if (
      error instanceof Error &&
      error.message === "BOOKING_CAPACITY_EXCEEDED"
    ) {
      return NextResponse.json(
        {
          error: "この納期は先に依頼が入り、受付できなくなりました。",
        },
        {
          status: 409,
        },
      );
    }

    return NextResponse.json(
      {
        error: "依頼の保存に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }
    const body = await request.json();

    const id = Number(body.id);

    if (!Number.isInteger(id)) {
      return NextResponse.json(
        {
          error: "案件IDが不正です。",
        },
        {
          status: 400,
        },
      );
    }

    const current = await prisma.booking.findUnique({
      where: {
        id,
      },

      include: {
        allocations: true,
      },
    });

    if (!current) {
      return NextResponse.json(
        {
          error: "案件が見つかりません。",
        },
        {
          status: 404,
        },
      );
    }

    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");

    const nextStatus = hasStatus ? body.status : current.status;

    if (!allowedStatuses.includes(nextStatus)) {
      return NextResponse.json(
        {
          error: "ステータスが不正です。",
        },
        {
          status: 400,
        },
      );
    }

    // キャンセルは履歴として割当を残す
    if (nextStatus === "cancelled") {
      const booking = await prisma.booking.update({
        where: {
          id,
        },

        data: {
          status: "cancelled",
        },

        include: {
          allocations: {
            orderBy: {
              date: "asc",
            },
          },
        },
      });

      return NextResponse.json({
        booking,
      });
    }

    // 一度キャンセルした案件を
    // 自動復活させるのは危険なので禁止
    if (current.status === "cancelled") {
      return NextResponse.json(
        {
          error: "キャンセル済み案件は自動では復活できません。",
        },
        {
          status: 400,
        },
      );
    }

    const nextPlanLabel = Object.prototype.hasOwnProperty.call(
      body,
      "planLabel",
    )
      ? String(body.planLabel ?? "").trim()
      : current.planLabel;

    const nextAdminNote = Object.prototype.hasOwnProperty.call(
      body,
      "adminNote",
    )
      ? String(body.adminNote ?? "").trim()
      : current.adminNote;

    const nextQuotedPrice = Object.prototype.hasOwnProperty.call(
      body,
      "quotedPrice",
    )
      ? Number(body.quotedPrice)
      : current.quotedPrice;

    const nextCostPoint = Object.prototype.hasOwnProperty.call(
      body,
      "costPoint",
    )
      ? Number(body.costPoint)
      : current.costPoint;

    const nextDeliveryDate = Object.prototype.hasOwnProperty.call(
      body,
      "deliveryDate",
    )
      ? String(body.deliveryDate)
      : current.deliveryDate;

    const tomorrow = getTomorrowInJapan();

    const dayAfterTomorrow = shiftDate(tomorrow, 1);

    const nextIsExpress =
      nextDeliveryDate === tomorrow || nextDeliveryDate === dayAfterTomorrow;

    if (
      nextQuotedPrice !== null &&
      (!Number.isInteger(nextQuotedPrice) || nextQuotedPrice < 0)
    ) {
      return NextResponse.json(
        {
          error: "料金が不正です。",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(nextCostPoint) || nextCostPoint < 1) {
      return NextResponse.json(
        {
          error: "作業量は1pt以上にしてください。",
        },
        {
          status: 400,
        },
      );
    }

    const needsReallocation =
      nextCostPoint !== current.costPoint ||
      nextDeliveryDate !== current.deliveryDate;

    const booking = await prisma.$transaction(async (tx) => {
      if (needsReallocation) {
        const plan = await createAllocationPlan(
          tx,
          id,
          nextDeliveryDate,
          nextCostPoint,
        );

        await tx.workAllocation.deleteMany({
          where: {
            bookingId: id,
          },
        });

        await tx.workAllocation.createMany({
          data: plan.map((allocation) => ({
            bookingId: id,

            date: allocation.date,

            points: allocation.points,
          })),
        });
      }

      return tx.booking.update({
        where: {
          id,
        },

        data: {
          status: nextStatus,

          planLabel: nextPlanLabel || null,

          quotedPrice: nextQuotedPrice,

          adminNote: nextAdminNote || null,

          costPoint: nextCostPoint,

          deliveryDate: nextDeliveryDate,

          isExpress: nextIsExpress,
        },

        include: {
          allocations: {
            orderBy: {
              date: "asc",
            },
          },
        },
      });
    });

    return NextResponse.json({
      booking,
    });
  } catch (error) {
    console.error(error);

    if (
      error instanceof Error &&
      error.message === "BOOKING_CAPACITY_EXCEEDED"
    ) {
      return NextResponse.json(
        {
          error: "この作業量では現在の納期に収まりません。",
        },
        {
          status: 409,
        },
      );
    }

    if (error instanceof Error && error.message === "DATE_NOT_AVAILABLE") {
      return NextResponse.json(
        {
          error: "指定した日を納期に設定できません。",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error: "案件の更新に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}

// 開発確認用。
// 公開前には管理者認証を入れる。
export async function GET() {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }
    const bookings = await prisma.booking.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        allocations: {
          orderBy: {
            date: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      bookings,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "案件一覧の取得に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
