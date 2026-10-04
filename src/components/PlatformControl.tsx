"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, Building2, DollarSign, ShieldAlert } from "lucide-react";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plan_code: string;
  subscription_status: string;
};
type PlatformData = {
  totals: { workspaces: number; active: number; suspended: number; trialing: number };
  workspaces: WorkspaceRow[];
};

export function PlatformControl() {
  const [data, setData] = useState<PlatformData | null>(null);
  const [notice,setNotice]=useState<string|null>(null);

  const load=useCallback(async()=>{
    const response=await fetch("/api/platform/workspaces",{cache:"no-store"});
    if(!response.ok)throw new Error("No autorizado.");
    setData(await response.json());
  },[]);

  useEffect(()=>{void load().catch(()=>setData(null));},[load]);

  async function patch(workspaceId:string, body:Record<string,unknown>){
    setNotice(null);
    const response=await fetch("/api/platform/workspaces",{
      method:"PATCH",headers:{"content-type":"application/json"},
      body:JSON.stringify({workspaceId,...body})
    });
    const json=await response.json().catch(()=>({}));
    if(!response.ok){setNotice(json.error??"No se pudo aplicar el cambio.");return;}
    setNotice("Cambio aplicado y auditado.");
    await load();
  }

  if (!data) return <main className="app-loading">Cargando Platform Control…</main>;

  return (
    <main className="control-page">
      <header className="control-header">
        <div><span className="signal-label">MSJ / INTERNAL</span><h1>Platform Control</h1><p>Tenants, consumo, seguridad y continuidad operacional.</p></div>
        <span className="health-pill"><i/> PLATFORM ONLINE</span>
      </header>
      {notice&&<div className="setup-notice">{notice}</div>}
      <div className="metric-grid control-metrics">
        <article><Building2 size={18}/><span>Workspaces</span><strong>{data.totals.workspaces}</strong></article>
        <article><Activity size={18}/><span>Activos</span><strong>{data.totals.active}</strong></article>
        <article><DollarSign size={18}/><span>Trials</span><strong>{data.totals.trialing}</strong></article>
        <article><ShieldAlert size={18}/><span>Suspendidos</span><strong>{data.totals.suspended}</strong></article>
      </div>
      <section className="ops-panel">
        <div className="ops-panel-head"><div><small>TENANTS</small><h2>Estado de plataforma</h2></div></div>
        <div className="control-table">
          <div className="control-row head"><span>Workspace</span><span>Plan</span><span>Suscripción</span><span>Estado</span><span>Acciones</span></div>
          {data.workspaces.map((w)=>(
            <div className="control-row" key={w.id}>
              <span><strong>{w.name}</strong><small>{w.slug}</small></span>
              <select value={w.plan_code} onChange={(e)=>void patch(w.id,{planCode:e.target.value})}>
                <option value="starter">starter</option><option value="growth">growth</option><option value="scale">scale</option><option value="enterprise">enterprise</option>
              </select>
              <span>{w.subscription_status}</span>
              <span className={w.status === "active" ? "ok-text" : "warn-text"}>{w.status}</span>
              <span className="control-actions">
                {w.status==="active"
                  ? <button onClick={()=>void patch(w.id,{workspaceStatus:"suspended"})}>Suspender</button>
                  : <button onClick={()=>void patch(w.id,{workspaceStatus:"active"})}>Activar</button>}
              </span>
            </div>
          ))}
        </div>
      </section>
      <div className="internal-warning"><AlertTriangle size={16}/> Las acciones están limitadas por rol en el servidor y generan audit_event.</div>
    </main>
  );
}
