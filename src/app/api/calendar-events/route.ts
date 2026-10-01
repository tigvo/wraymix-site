import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }
    const events = await prisma.calendarEvent.findMany({
      orderBy: [
        {
          date: "asc",
        },
        {
          id: "asc",
        },
      ],
    });

    return NextResponse.json({
      events,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "予定の取得に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }
    const body = await request.json();

    const date = typeof body.date === "string" ? body.date : "";

    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!date || !title) {
      return NextResponse.json(
        {
          error: "日付と予定名を入力してください。",
        },
        {
          status: 400,
        },
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        date,
        title,
      },
    });

    return NextResponse.json({
      event,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "予定の保存に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(request: Request) {
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
          error: "予定IDが不正です。",
        },
        {
          status: 400,
        },
      );
    }

    await prisma.calendarEvent.deleteMany({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "予定の削除に失敗しました。",
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

    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!Number.isInteger(id) || !title) {
      return NextResponse.json(
        {
          error: "入力内容が不正です。",
        },
        {
          status: 400,
        },
      );
    }

    const event = await prisma.calendarEvent.update({
      where: {
        id,
      },
      data: {
        title,
      },
    });

    return NextResponse.json({
      event,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "予定の更新に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
