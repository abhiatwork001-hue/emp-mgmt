import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50">
      <div className="w-full max-w-md space-y-8 px-4 sm:px-0">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">Chick Main</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Employee Management System
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <Link
            href="/login"
            className="flex w-full justify-center rounded-md bg-zinc-900 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
