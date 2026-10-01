import { auth, signIn } from "@/auth";

import Link from "next/link";

import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  const currentEmail = session?.user?.email?.trim().toLowerCase();

  if (adminEmail && currentEmail === adminEmail) {
    redirect("/admin/schedule");
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f1df] px-5 text-[#202020]">
      <section className="w-full max-w-md rounded-3xl border-2 border-black bg-[#dcd4f5] p-8 shadow-[7px_7px_0_#202020]">
        <p className="text-xs font-black tracking-[0.2em]">WRAYMIX</p>

        <h1 className="mt-2 text-4xl font-black">ADMIN</h1>

        <p className="mt-4 text-sm leading-6 text-black/60">
          管理画面にアクセスするには Googleアカウントでログインしてください。
        </p>

        {params.error && (
          <div className="mt-5 rounded-xl border-2 border-black bg-[#f6cbd3] p-4 text-sm font-bold">
            このGoogleアカウントでは 管理画面にアクセスできません。
          </div>
        )}

        <form
          className="mt-7"
          action={async () => {
            "use server";

            await signIn("google", {
              redirectTo: "/admin/schedule",
            });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-xl border-2 border-black bg-black px-6 py-4 font-black text-white shadow-[4px_4px_0_#bfe3d1] transition hover:-translate-y-0.5"
          >
            Googleでログイン →
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 block text-center text-xs font-bold underline"
        >
          WRAYMIXへ戻る
        </Link>
      </section>
    </main>
  );
}
