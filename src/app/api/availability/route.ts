import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { buildAllocationPlan, shiftDate } from "@/lib/allocation";

import { getBasePrice, getBookingCost, type ServiceType } from "@/lib/booking";

import { addDays, getTodayInJapan, getTomorrowInJapan } from "@/lib/japanDate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const service = searchParams.get("service");

    const singers = Number(searchParams.get("singers") ?? 1);

    if (service !== "full" && service !== "short") {
      return NextResponse.json(
        {
          error: "不正なコースです。",
        },
        {
          status: 400,
        },
      );
    }

    const singerCount = Number.isInteger(singers) && singers >= 1 ? singers : 1;

    const requiredCost = getBookingCost(service as ServiceType, singerCount);

    const basePrice = getBasePrice(service as ServiceType);

    const today = getTodayInJapan();
    const tomorrow = getTomorrowInJapan();
    const rushDeadline = addDays(today, 2);

    // 今日も「作業日」として使うため取得する
    const scheduleDays = await prisma.scheduleDay.findMany({
      where: {
        date: {
          gte: today,
        },
      },

      orderBy: {
        date: "asc",
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

    const workDays = scheduleDays.map((day) => ({
      date: day.date,
      capacity: day.capacity,

      used: day.allocations.reduce((total, allocation) => {
        if (allocation.booking.status === "cancelled") {
          return total;
        }

        return total + allocation.points;
      }, 0),
    }));

    const availability = scheduleDays
      // 当日は表示しない。翌日以降はOFFの日も返す
      .filter((day) => day.bookable && day.capacity > 0 && day.date >= tomorrow)
      .map((deliveryDay) => {
        const isExpress = deliveryDay.date <= rushDeadline;

        // 管理側でOFF、または0ptの日は
        // 客側では「受付終了」として表示する
        if (!deliveryDay.bookable || deliveryDay.capacity <= 0) {
          return {
            date: deliveryDay.date,
            status: "full" as const,
            isExpress,
            estimatedPrice: isExpress ? Math.round(basePrice * 1.5) : basePrice,
          };
        }

        const candidateStart = shiftDate(deliveryDay.date, -7);

        const startDate = candidateStart < today ? today : candidateStart;

        const usableDays = workDays.filter(
          (day) => day.date >= startDate && day.date <= deliveryDay.date,
        );

        const plan = buildAllocationPlan(usableDays, requiredCost);

        const totalFree = usableDays.reduce(
          (total, day) => total + Math.max(day.capacity - day.used, 0),
          0,
        );

        let status: "available" | "few" | "full";

        if (!plan) {
          status = "full";
        } else if (totalFree - requiredCost < 5) {
          status = "few";
        } else {
          status = "available";
        }

        return {
          date: deliveryDay.date,
          status,
          isExpress,

          estimatedPrice: isExpress ? Math.round(basePrice * 1.5) : basePrice,
        };
      });

    const earliestAvailableDate =
      availability.find((day) => day.status !== "full")?.date ?? null;

    return NextResponse.json({
      availability,
      earliestAvailableDate,
      basePrice,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "空き状況の取得に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
