import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const publicOnly = searchParams.get("public") === "1";

    if (!publicOnly) {
      const authError = await requireAdmin();

      if (authError) {
        return authError;
      }
    }

    const items = await prisma.portfolioItem.findMany({
      where: publicOnly
        ? {
            published: true,
          }
        : undefined,

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          id: "asc",
        },
      ],
    });

    return NextResponse.json({
      items,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "作品一覧の取得に失敗しました。",
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

    const title = typeof body.title === "string" ? body.title.trim() : "";

    const creatorName =
      typeof body.creatorName === "string" ? body.creatorName.trim() : "";

    const url = typeof body.url === "string" ? body.url.trim() : "";

    const thumbnailUrl =
      typeof body.thumbnailUrl === "string" ? body.thumbnailUrl.trim() : "";

    const category =
      typeof body.category === "string" ? body.category.trim() : "";

    const rawSourceBookingId = body.sourceBookingId;

    const sourceBookingId = Number(rawSourceBookingId);

    const hasSourceBookingId =
      rawSourceBookingId !== null &&
      rawSourceBookingId !== undefined &&
      Number.isInteger(sourceBookingId);

    if (!title || !url) {
      return NextResponse.json(
        {
          error: "タイトルと作品URLは必須です。",
        },
        {
          status: 400,
        },
      );
    }

    const lastItem = await prisma.portfolioItem.findFirst({
      orderBy: {
        sortOrder: "desc",
      },
    });

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.portfolioItem.create({
        data: {
          title,
          creatorName: creatorName || null,
          url,
          thumbnailUrl: thumbnailUrl || null,
          category: category || null,
          published: true,
          sortOrder: (lastItem?.sortOrder ?? -1) + 1,
        },
      });

      if (hasSourceBookingId) {
        await tx.booking.updateMany({
          where: {
            id: sourceBookingId,
            portfolioPermission: "approved",
            portfolioQueued: true,
          },

          data: {
            portfolioQueued: false,
          },
        });
      }

      return created;
    });

    return NextResponse.json({
      item,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "作品の追加に失敗しました。",
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
          error: "作品IDが不正です。",
        },
        {
          status: 400,
        },
      );
    }

    const item = await prisma.portfolioItem.update({
      where: {
        id,
      },

      data: {
        ...(typeof body.title === "string"
          ? {
              title: body.title.trim(),
            }
          : {}),

        ...(typeof body.creatorName === "string"
          ? {
              creatorName: body.creatorName.trim() || null,
            }
          : {}),

        ...(typeof body.url === "string"
          ? {
              url: body.url.trim(),
            }
          : {}),

        ...(typeof body.thumbnailUrl === "string"
          ? {
              thumbnailUrl: body.thumbnailUrl.trim() || null,
            }
          : {}),

        ...(typeof body.category === "string"
          ? {
              category: body.category.trim() || null,
            }
          : {}),

        ...(typeof body.published === "boolean"
          ? {
              published: body.published,
            }
          : {}),

        ...(Number.isInteger(body.sortOrder)
          ? {
              sortOrder: body.sortOrder,
            }
          : {}),
      },
    });

    return NextResponse.json({
      item,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "作品の更新に失敗しました。",
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
          error: "作品IDが不正です。",
        },
        {
          status: 400,
        },
      );
    }

    await prisma.portfolioItem.delete({
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
        error: "作品の削除に失敗しました。",
      },
      {
        status: 500,
      },
    );
  }
}
