"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      {state.error && <p className="alert err" role="alert" style={{ margin: 0 }}>{state.error}</p>}
      <label className="field">
        <span className="label">Password</span>
        <input className="input big" type="password" name="password" autoComplete="current-password" required autoFocus />
      </label>
      <button className="btn lg" type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
