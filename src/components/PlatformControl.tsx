"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Building2, DollarSign, ShieldAlert } from "lucide-react";

type PlatformData = {
  totals: { workspaces: number; active: number; suspended: number; trialing: number };
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    created_at: string;
    plan_code: string;
    subscription_status: string;
  }>;
};

export function PlatformControl() {
  const [data, setData] = useState<PlatformData | null>(null);

  useEffect(() => {
    fetch("/api/platform/workspaces", { cache: "no-store" })
      .then((r)=> r.ok ? r.json() : Promise.reject())
      .then(setData)
      .catch(()=>setData(null));
  }, []);

  if (!data) return <main className="app-loading">Cargando Platform Control…</main>;

  return (
    <main className="control-page">
      <header className="control-header">
        <div><span className="signal-label">MSJ / INTERNAL</span><h1>Platform Control</h1><p>Tenants, consumo, seguridad y continuidad operacional.</p></div>
        <span className="health-pill"><i/> PLATFORM ONLINE</span>
      </header>
      <div className="metric-grid control-metrics">
        <article><Building2 size={18}/><span>Workspaces</span><strong>{data.totals.workspaces}</strong></article>
        <article><Activity size={18}/><span>Activos</span><strong>{data.totals.active}</strong></article>
        <article><DollarSign size={18}/><span>Trials</span><strong>{data.totals.trialing}</strong></article>
        <article><ShieldAlert size={18}/><span>Suspendidos</span><strong>{data.totals.suspended}</strong></article>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-head"><div><small>TENANTS</small><h2>Estado de plataforma</h2></div></div>
        <div className="control-table">
          <div className="control-row head"><span>Workspace</span><span>Plan</span><span>Suscripción</span><span>Estado</span><span>Creado</span></div>
          {data.workspaces.map((w)=>(
            <div className="control-row" key={w.id}>
              <span><strong>{w.name}</strong><small>{w.slug}</small></span>
              <span>{w.plan_code}</span><span>{w.subscription_status}</span>
              <span className={w.status === "active" ? "ok-text" : "warn-text"}>{w.status}</span>
              <span>{new Date(w.created_at).toLocaleDateString("es-CL")}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="internal-warning"><AlertTriangle size={16}/> Este panel es interno. El acceso debe limitarse a usuarios incluidos en platform_admin.</div>
    </main>
  );
}
