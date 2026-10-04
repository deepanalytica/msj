"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Cable, PlugZap, ShieldCheck } from "lucide-react";

type Channel={id:string;platform:string;external_account_id:string;display_name:string|null;status:string};
type Integration={id:string;provider_type:string;name:string;base_url:string;enabled:boolean};
type Assistant={enabled:boolean;model:string;system_prompt:string;max_history_messages:number};

export function SetupConsole(){
  const [channels,setChannels]=useState<Channel[]>([]);
  const [integrations,setIntegrations]=useState<Integration[]>([]);
  const [assistant,setAssistant]=useState<Assistant>({enabled:false,model:"gpt-5.6-luna",system_prompt:"",max_history_messages:12});
  const [notice,setNotice]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  const [channelForm,setChannelForm]=useState({platform:"whatsapp",externalAccountId:"",displayName:"",accessToken:""});
  const [integrationForm,setIntegrationForm]=useState({providerType:"custom",name:"",baseUrl:"",secret:""});

  async function load(){
    const [c,a,i]=await Promise.all([
      fetch("/api/channels",{cache:"no-store"}),
      fetch("/api/assistant",{cache:"no-store"}),
      fetch("/api/integrations",{cache:"no-store"})
    ]);
    if(c.ok)setChannels((await c.json()).channels??[]);
    if(a.ok)setAssistant((await a.json()).assistant);
    if(i.ok)setIntegrations((await i.json()).integrations??[]);
  }
  useEffect(()=>{void load();},[]);

  async function connectChannel(e:FormEvent){
    e.preventDefault();setBusy(true);setError(null);setNotice(null);
    const response=await fetch("/api/channels",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(channelForm)});
    const json=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setError(json.error??"No se pudo conectar.");return;}
    setChannelForm({...channelForm,externalAccountId:"",displayName:"",accessToken:""});
    setNotice("Canal conectado. El token quedó cifrado.");
    await load();
  }

  async function saveAssistant(e:FormEvent){
    e.preventDefault();setBusy(true);setError(null);setNotice(null);
    const response=await fetch("/api/assistant",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({
      enabled:assistant.enabled,model:assistant.model,systemPrompt:assistant.system_prompt,maxHistoryMessages:assistant.max_history_messages
    })});
    const json=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setError(json.error??"No se pudo guardar.");return;}
    setNotice("Asistente actualizado.");
    await load();
  }

  async function connectIntegration(e:FormEvent){
    e.preventDefault();setBusy(true);setError(null);setNotice(null);
    const response=await fetch("/api/integrations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(integrationForm)});
    const json=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setError(json.error??"No se pudo conectar.");return;}
    setIntegrationForm({providerType:"custom",name:"",baseUrl:"",secret:""});
    setNotice("Integración conectada.");
    await load();
  }

  return <main className="setup-page">
    <header className="setup-header">
      <Link href="/app" className="setup-back"><ArrowLeft size={16}/></Link>
      <div><span className="signal-label">CONFIGURACIÓN</span><h1>Canales, IA e integraciones</h1><p>Las credenciales nunca vuelven al navegador después de guardarse.</p></div>
    </header>
    {(notice||error)&&<div className={error?"setup-notice error":"setup-notice"}>{error||notice}</div>}
    <div className="setup-grid">
      <section className="setup-card">
        <div className="setup-card-head"><Cable size={19}/><div><strong>Canales Meta</strong><span>Conexión API directa</span></div></div>
        <form onSubmit={connectChannel}>
          <label>Plataforma<select value={channelForm.platform} onChange={(e)=>setChannelForm({...channelForm,platform:e.target.value})}><option value="whatsapp">WhatsApp</option><option value="instagram">Instagram</option><option value="messenger">Messenger</option></select></label>
          <label>ID externo<input value={channelForm.externalAccountId} onChange={(e)=>setChannelForm({...channelForm,externalAccountId:e.target.value})} placeholder="Phone Number ID / IG ID / Page ID" required/></label>
          <label>Nombre<input value={channelForm.displayName} onChange={(e)=>setChannelForm({...channelForm,displayName:e.target.value})} placeholder="Canal principal"/></label>
          <label>Access token<input type="password" value={channelForm.accessToken} onChange={(e)=>setChannelForm({...channelForm,accessToken:e.target.value})} minLength={20} required/></label>
          <button className="button dark full" disabled={busy}>Guardar canal</button>
        </form>
        <div className="setup-list">{channels.map((c)=><div key={c.id}><span>{c.platform}</span><strong>{c.display_name||c.external_account_id}</strong><small>{c.status}</small></div>)}</div>
      </section>

      <section className="setup-card">
        <div className="setup-card-head"><Bot size={19}/><div><strong>Asistente</strong><span>Gobierno de IA</span></div></div>
        <form onSubmit={saveAssistant}>
          <label className="toggle-label"><input type="checkbox" checked={assistant.enabled} onChange={(e)=>setAssistant({...assistant,enabled:e.target.checked})}/> IA activa</label>
          <label>Modelo<input value={assistant.model} onChange={(e)=>setAssistant({...assistant,model:e.target.value})}/></label>
          <label>Contexto del negocio<textarea rows={8} value={assistant.system_prompt} onChange={(e)=>setAssistant({...assistant,system_prompt:e.target.value})} placeholder="Servicios, horarios, políticas, tono, condiciones comerciales…"/></label>
          <label>Historial<input type="number" min={1} max={30} value={assistant.max_history_messages} onChange={(e)=>setAssistant({...assistant,max_history_messages:Number(e.target.value)||1})}/></label>
          <button className="button lime full" disabled={busy}>Guardar asistente</button>
        </form>
        <div className="security-note"><ShieldCheck size={15}/> El modelo sólo puede usar tools registradas. No recibe credenciales ni acceso SQL.</div>
      </section>

      <section className="setup-card">
        <div className="setup-card-head"><PlugZap size={19}/><div><strong>Integraciones</strong><span>Tool Providers</span></div></div>
        <form onSubmit={connectIntegration}>
          <label>Tipo<input value={integrationForm.providerType} onChange={(e)=>setIntegrationForm({...integrationForm,providerType:e.target.value})} placeholder="clinia / crm / custom"/></label>
          <label>Nombre<input value={integrationForm.name} onChange={(e)=>setIntegrationForm({...integrationForm,name:e.target.value})} required/></label>
          <label>Base URL<input type="url" value={integrationForm.baseUrl} onChange={(e)=>setIntegrationForm({...integrationForm,baseUrl:e.target.value})} placeholder="https://api.ejemplo.cl" required/></label>
          <label>Secreto HMAC<input type="password" value={integrationForm.secret} onChange={(e)=>setIntegrationForm({...integrationForm,secret:e.target.value})} minLength={16} required/></label>
          <button className="button dark full" disabled={busy}>Conectar integración</button>
        </form>
        <div className="setup-list">{integrations.map((i)=><div key={i.id}><span>{i.provider_type}</span><strong>{i.name}</strong><small>{i.enabled?"activa":"pausada"}</small></div>)}</div>
      </section>
    </div>
  </main>;
}
