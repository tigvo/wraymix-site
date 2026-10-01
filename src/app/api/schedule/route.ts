import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/adminAuth";

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
      const activeAllocations = day.allocations.filter(
        (allocation) => allocation.booking.status !== "cancelled",
      );

      return {
        id: day.id,

        date: day.date,

        capacity: day.capacity,

        bookable: day.bookable,

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

    const hasBookable = typeof body.bookable === "boolean";

    if (!hasCapacity && !hasBookable) {
      return NextResponse.json(
        {
          error: "変更内容がありません。",
        },
        {
          status: 400,
        },
      );
    }

    const capacity = hasCapacity ? Number(body.capacity) : null;

    if (
      hasCapacity &&
      (!Number.isInteger(capacity) || capacity === null || capacity < 0)
    ) {
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

    if (capacity !== null) {
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
            if (allocation.booking.status === "cancelled") {
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
    }

    await prisma.$transaction(
      uniqueDates.map((date) =>
        prisma.scheduleDay.upsert({
          where: {
            date,
          },

          update: {
            ...(capacity !== null
              ? {
                  capacity,
                }
              : {}),

            ...(hasBookable
              ? {
                  bookable: body.bookable,
                }
              : {}),
          },

          create: {
            date,

            capacity: capacity ?? 0,

            bookable: hasBookable ? body.bookable : true,
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
