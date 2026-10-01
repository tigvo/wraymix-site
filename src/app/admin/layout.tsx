import { auth } from "@/auth";

import { redirect } from "next/navigation";

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

  return children;
}
