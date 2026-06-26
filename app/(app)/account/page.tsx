import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SignOutButton from "@/components/SignOutButton";
import TaxProfileForm from "@/components/TaxProfileForm";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, taxProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.taxProfile.findUnique({ where: { userId: session.userId } }),
  ]);

  if (!user) redirect("/login");

  const initial = (user.username ?? user.email)[0].toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <div className="px-4 pt-12 pb-6 flex items-center justify-between border-b border-zinc-100">
        <div>
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-widest">ShiftTrack</p>
          <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">Account</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg active:bg-zinc-200 transition-colors"
        >
          ← Back
        </Link>
      </div>

      {/* Profile */}
      <section className="px-4 mt-6">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Profile</p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            {user.username && (
              <p className="font-semibold text-zinc-900 truncate">{user.username}</p>
            )}
            <p className="text-sm text-zinc-500 truncate">{user.email}</p>
          </div>
        </div>
      </section>

      {/* Tax settings */}
      <section className="px-4 mt-6">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">Tax region</p>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
          <p className="text-sm text-zinc-500 mb-4">
            Set your country and province so your payday summary can show estimated net pay after deductions.
            Leave blank to show gross pay only.
          </p>
          <TaxProfileForm
            initial={taxProfile ? { country: taxProfile.country, region: taxProfile.region } : null}
          />
        </div>
      </section>

      {/* Sign out */}
      <section className="px-4 mt-6">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <SignOutButton />
        </div>
      </section>
    </div>
  );
}
