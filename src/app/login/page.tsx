import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-navy-950 to-navy-800 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-white">
            <span className="text-gold">Pak</span>Gold
            <span className="text-sm font-normal text-white/50 ml-1">POS</span>
          </div>
          <div className="urdu text-gold/80 mt-1">پاک گولڈ — سونے کا پی او ایس</div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-lg font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-4">Welcome back. Please log in to continue.</p>
          <LoginForm />
        </div>
        <p className="text-center text-xs text-white/40 mt-4">Offline ready • v0.1</p>
      </div>
    </div>
  );
}
