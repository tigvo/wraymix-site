import { auth } from "@/auth";

import { redirect } from "next/navigation";
import AdminHeader from "./AdminHeader";

import type { Metadata } from "next";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  const currentEmail = session?.user?.email?.trim().toLowerCase();

  if (!adminEmail || currentEmail !== adminEmail) {
    redirect("/login");
  }

  return (
    <>
      <AdminHeader />
      {children}
    </>
  );
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
