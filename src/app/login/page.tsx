"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <a className="marketing-brand auth-brand" href="/">
        <span className="marketing-brandmark">M</span>
        <span><strong>MSJ</strong><small>Conversation Infrastructure</small></span>
      </a>
      <form className="auth-card" onSubmit={submit}>
        <span className="signal-label">ACCESO SEGURO</span>
        <h1>{mode === "login" ? "Entrar a MSJ" : "Crear cuenta"}</h1>
        <p>{mode === "login" ? "Accede a tus workspaces y conversaciones." : "Crea tu cuenta. Después configuraremos tu primer workspace."}</p>
        <label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email"/></label>
        <label>Contraseña<input type="password" required minLength={8} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"}/></label>
        {error && <div className="form-error">{error}</div>}
        <button className="button lime full" type="submit" disabled={busy}>{busy ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}</button>
        <button className="auth-switch" type="button" onClick={()=>setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
    </main>
  );
}
