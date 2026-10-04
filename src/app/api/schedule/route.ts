import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/adminAuth";

import { bookingConsumesCapacity } from "@/lib/booking";

export async function GET() {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const days = await prisma.scheduleDay.findMany({
      orderBy: {
        date: "asc",
      },

      include: {
        allocations: {
          include: {
            booking: {
              include: {
                allocations: {
                  orderBy: {
                    date: "asc",
                  },

                  select: {
                    date: true,
                    points: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = days.map((day) => {
      // capacityを実際に消費している案件だけ
      const activeAllocations = day.allocations.filter((allocation) =>
        bookingConsumesCapacity(allocation.booking.status),
      );

      return {
        id: day.id,

        date: day.date,

        capacity: day.capacity,

        used: activeAllocations.reduce(
          (total, allocation) => total + allocation.points,
          0,
        ),

        allocations: activeAllocations.map((allocation) => ({
          id: allocation.id,

          date: allocation.date,

          points: allocation.points,

          booking: allocation.booking,
        })),
      };
    });

    return NextResponse.json({
      days: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "スケジュールの取得に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const body = await request.json();

    const dates = Array.isArray(body.dates)
      ? body.dates.filter((date: unknown) => typeof date === "string")
      : [];

    if (dates.length === 0) {
      return NextResponse.json(
        {
          error: "日付が指定されていません。",
        },
        {
          status: 400,
        },
      );
    }

    const hasCapacity = Object.prototype.hasOwnProperty.call(body, "capacity");

    if (!hasCapacity) {
      return NextResponse.json(
        {
          error: "変更内容がありません。",
        },
        {
          status: 400,
        },
      );
    }

    const capacity = Number(body.capacity);

    if (!Number.isInteger(capacity) || capacity < 0) {
      return NextResponse.json(
        {
          error: "キャパが不正です。",
        },
        {
          status: 400,
        },
      );
    }

    const uniqueDates = [...new Set<string>(dates)];

    const existingDays = await prisma.scheduleDay.findMany({
      where: {
        date: {
          in: uniqueDates,
        },
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

    const conflicts = existingDays
      .map((day) => ({
        date: day.date,

        used: day.allocations.reduce((total, allocation) => {
          if (!bookingConsumesCapacity(allocation.booking.status)) {
            return total;
          }

          return total + allocation.points;
        }, 0),
      }))
      .filter((day) => day.used > capacity);

    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: "既存の作業予定より小さいキャパにはできません。",
          conflicts,
        },
        {
          status: 409,
        },
      );
    }

    await prisma.$transaction(
      uniqueDates.map((date) =>
        prisma.scheduleDay.upsert({
          where: {
            date,
          },

          update: {
            capacity,

            // DBにはまだカラムが残っているので自動同期だけしておく
            bookable: capacity > 0,
          },

          create: {
            date,

            capacity,

            // capacityだけを真実として扱う
            bookable: capacity > 0,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "スケジュールの保存に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
