import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { buildAllocationPlan, shiftDate } from "@/lib/allocation";

import {
  bookingConsumesCapacity,
  getBasePrice,
  getBookingCost,
  type ServiceType,
} from "@/lib/booking";

import { addDays, getTodayInJapan, getTomorrowInJapan } from "@/lib/japanDate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const service = searchParams.get("service");

    const singers = Number(searchParams.get("singers") ?? 1);

    const validServices = ["full", "one_chorus", "short"] as const;

    if (
      typeof service !== "string" ||
      !validServices.includes(service as (typeof validServices)[number])
    ) {
      return NextResponse.json(
        {
          error: "不正なコースです。",
        },
        {
          status: 400,
        },
      );
    }

    const serviceType = service as ServiceType;

    const singerCount = Number.isInteger(singers) && singers >= 1 ? singers : 1;

    const requiredCost = getBookingCost(serviceType, singerCount);

    const basePrice = getBasePrice(serviceType);

    const today = getTodayInJapan();

    const tomorrow = getTomorrowInJapan();

    const rushDeadline = addDays(today, 2);

    // 今日も作業日として使用するため取得
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
        if (!bookingConsumesCapacity(allocation.booking.status)) {
          return total;
        }

        return total + allocation.points;
      }, 0),
    }));

    const availability = scheduleDays
      // 当日の予約だけ不可。
      // OFF / 0pt の日も × FULL として返す
      .filter((day) => day.date >= tomorrow)
      .map((deliveryDay) => {
        const isExpress = deliveryDay.date <= rushDeadline;

        const estimatedPrice = isExpress
          ? Math.round(basePrice * 1.5)
          : basePrice;

        // 管理側でOFF、またはcapacity 0の日
        if (deliveryDay.capacity <= 0) {
          return {
            date: deliveryDay.date,
            status: "full" as const,
            isExpress,
            estimatedPrice,
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
          estimatedPrice,
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
