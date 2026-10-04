"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  Cable,
  LogOut,
  MessageCircle,
  MessagesSquare,
  PlugZap,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Summary = {
  workspace: { id: string; name: string; slug: string; status: string } | null;
  plan: string;
  usage: {
    active_contacts: number;
    ai_replies: number;
    inbound_messages: number;
    outbound_messages: number;
  };
  channels: number;
  integrations: number;
};

export function AppConsole() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/workspace/summary", { cache: "no-store" });
    if (!response.ok) {
      setError("No se pudo cargar el workspace.");
      return;
    }
    setSummary(await response.json());
  }

  useEffect(() => { void load(); }, []);

  async function createWorkspace() {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: workspaceName }),
    });
    if (!response.ok) {
      const body = await response.json().catch(()=>({}));
      setError(body.error ?? "No se pudo crear el workspace.");
      return;
    }
    setWorkspaceName("");
    await load();
  }

  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    window.location.assign("/");
  }

  if (!summary) {
    return <main className="app-loading">Cargando MSJ…</main>;
  }

  if (!summary.workspace) {
    return (
      <main className="workspace-create">
        <div className="workspace-create-card">
          <span className="marketing-brandmark">M</span>
          <span className="signal-label">PRIMER WORKSPACE</span>
          <h1>¿Cómo se llama tu negocio?</h1>
          <p>El workspace separa canales, usuarios, contactos, integraciones y consumo.</p>
          <input value={workspaceName} onChange={(e)=>setWorkspaceName(e.target.value)} placeholder="Ej. Estudio Norte"/>
          {error && <div className="form-error">{error}</div>}
          <button className="button lime full" onClick={()=>void createWorkspace()} disabled={workspaceName.trim().length < 2}>Crear workspace</button>
        </div>
      </main>
    );
  }

  return (
    <main className="product-shell">
      <aside className="product-sidebar">
        <a href="/" className="product-brand"><span>M</span><strong>MSJ</strong></a>
        <div className="workspace-chip"><small>WORKSPACE</small><strong>{summary.workspace.name}</strong><span>{summary.plan.toUpperCase()}</span></div>
        <nav>
          <a className="active"><Activity size={17}/> Operación</a>
          <a><MessagesSquare size={17}/> Conversaciones</a>
          <a><Cable size={17}/> Canales</a>
          <a><Bot size={17}/> Asistente</a>
          <a><PlugZap size={17}/> Integraciones</a>
          <a><Users size={17}/> Equipo</a>
          <a><ShieldCheck size={17}/> Auditoría</a>
          <a><Settings size={17}/> Configuración</a>
        </nav>
        <button className="sidebar-logout" onClick={()=>void signOut()}><LogOut size={15}/> Salir</button>
      </aside>

      <section className="product-content">
        <header className="product-header">
          <div><span className="signal-label">OPERACIÓN</span><h1>Centro de control</h1></div>
          <span className="health-pill"><i/> OPERACIONAL</span>
        </header>

        <div className="metric-grid">
          <article><span>Contactos activos</span><strong>{summary.usage.active_contacts.toLocaleString("es-CL")}</strong><small>este mes</small></article>
          <article><span>Respuestas IA</span><strong>{summary.usage.ai_replies.toLocaleString("es-CL")}</strong><small>este mes</small></article>
          <article><span>Canales</span><strong>{summary.channels}</strong><small>conectados</small></article>
          <article><span>Integraciones</span><strong>{summary.integrations}</strong><small>activas</small></article>
        </div>

        <div className="product-grid">
          <section className="ops-panel">
            <div className="ops-panel-head"><div><small>CANALES</small><h2>Entrada de mensajes</h2></div><button className="button dark">Conectar canal</button></div>
            <div className="empty-operational">
              <MessageCircle size={26}/>
              <strong>Conecta WhatsApp, Instagram o Messenger</strong>
              <p>MSJ recibirá mensajes por APIs oficiales y los llevará a una sola bandeja.</p>
            </div>
          </section>
          <section className="ops-panel">
            <div className="ops-panel-head"><div><small>ASISTENTE</small><h2>Gobierno de IA</h2></div><span className="status-neutral">PAUSED</span></div>
            <div className="rule-list">
              <div><i/><span><strong>AI</strong> responde y usa tools permitidas.</span></div>
              <div><i/><span><strong>HUMAN</strong> bloquea respuestas automáticas.</span></div>
              <div><i/><span><strong>PAUSED</strong> conserva contexto sin actuar.</span></div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
