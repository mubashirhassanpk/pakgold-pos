"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/authActions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Username</label>
        <input
          name="username"
          autoFocus
          autoComplete="username"
          defaultValue="owner"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 outline-none focus:border-gold"
        />
      </div>
      {state.error && (
        <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{state.error}</div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold text-navy-900 font-bold py-2.5 hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign In"}
      </button>
      {process.env.NODE_ENV !== "production" && (
        <p className="text-center text-[11px] text-gray-400">Default: owner / owner123</p>
      )}
    </form>
  );
}
