import "server-only";

import { auth } from "@/auth";

import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  const currentEmail = session?.user?.email?.trim().toLowerCase();

  if (adminEmail && currentEmail === adminEmail) {
    return null;
  }

  return NextResponse.json(
    {
      error: "管理者権限が必要です。",
    },
    {
      status: 401,
    },
  );
}
