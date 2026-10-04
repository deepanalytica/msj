"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Pause, Send, UserRound } from "lucide-react";

type Conversation = {
  id: string;
  mode: "ai" | "human" | "paused";
  last_message_at: string;
  contact: { display_name?: string | null; phone?: string | null } | null;
  channel: { platform?: string; display_name?: string | null } | null;
};
type Message = {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  occurred_at: string;
};

export function ConversationsConsole() {
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [draft,setDraft]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);

  async function loadConversations() {
    const response=await fetch("/api/inbox",{cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo cargar la bandeja.");
    const json=await response.json();
    setConversations(json.conversations??[]);
    setSelected((current)=>current??json.conversations?.[0]?.id??null);
  }

  async function loadMessages(id:string) {
    const response=await fetch(`/api/inbox?conversation=${encodeURIComponent(id)}`,{cache:"no-store"});
    if(!response.ok) throw new Error("No se pudo cargar la conversación.");
    const json=await response.json();
    setMessages(json.messages??[]);
  }

  useEffect(()=>{ void loadConversations().catch((e)=>setError(e.message)); },[]);
  useEffect(()=>{
    if(!selected){setMessages([]);return;}
    void loadMessages(selected).catch((e)=>setError(e.message));
    const timer=window.setInterval(()=>void loadMessages(selected).catch(()=>undefined),5000);
    return()=>window.clearInterval(timer);
  },[selected]);

  async function setMode(mode:"ai"|"human"|"paused") {
    if(!selected)return;
    setBusy(true);
    const response=await fetch("/api/inbox",{
      method:"PATCH",headers:{"content-type":"application/json"},
      body:JSON.stringify({conversationId:selected,mode})
    });
    setBusy(false);
    if(!response.ok){setError("No se pudo cambiar el modo.");return;}
    await loadConversations();
  }

  async function send(event:FormEvent){
    event.preventDefault();
    if(!selected||!draft.trim())return;
    setBusy(true);setError(null);
    const response=await fetch("/api/reply",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({conversationId:selected,text:draft.trim()})
    });
    const json=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setError(json.error??"No se pudo enviar.");return;}
    setDraft("");
    await Promise.all([loadMessages(selected),loadConversations()]);
  }

  const current=conversations.find((c)=>c.id===selected)??null;

  return <main className="inbox-shell">
    <aside className="inbox-list">
      <div className="inbox-title"><Link href="/app"><ArrowLeft size={15}/></Link><div><span>MSJ</span><strong>Conversaciones</strong></div></div>
      {conversations.length===0&&<p className="inbox-empty">Todavía no hay conversaciones.</p>}
      {conversations.map((conversation)=>{
        const name=conversation.contact?.display_name||conversation.contact?.phone||"Contacto";
        return <button key={conversation.id} className={conversation.id===selected?"inbox-item active":"inbox-item"} onClick={()=>setSelected(conversation.id)}>
          <span>{conversation.channel?.platform??"canal"} · {conversation.mode}</span>
          <strong>{name}</strong>
          <small>{new Date(conversation.last_message_at).toLocaleString("es-CL",{dateStyle:"short",timeStyle:"short"})}</small>
        </button>;
      })}
    </aside>
    <section className="thread-shell">
      {!current?<div className="thread-empty">Selecciona una conversación.</div>:<>
        <header className="thread-header">
          <div><strong>{current.contact?.display_name||"Contacto"}</strong><span>{current.channel?.platform} · {current.mode.toUpperCase()}</span></div>
          <div className="mode-controls">
            <button className={current.mode==="ai"?"active":""} disabled={busy} onClick={()=>void setMode("ai")}><Bot size={14}/> AI</button>
            <button className={current.mode==="human"?"active":""} disabled={busy} onClick={()=>void setMode("human")}><UserRound size={14}/> HUMAN</button>
            <button className={current.mode==="paused"?"active":""} disabled={busy} onClick={()=>void setMode("paused")}><Pause size={14}/> PAUSED</button>
          </div>
        </header>
        <div className="thread-body">
          {messages.map((message)=><div key={message.id} className={message.direction==="outbound"?"message-row outbound":"message-row inbound"}>
            <div className="message-bubble">{message.body}</div>
            <small>{new Date(message.occurred_at).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</small>
          </div>)}
        </div>
        <form className="reply-box" onSubmit={send}>
          {error&&<span className="form-error">{error}</span>}
          <div><textarea value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="Responder como persona…" rows={2}/><button className="button lime" disabled={busy||!draft.trim()}><Send size={15}/> Enviar</button></div>
          <small>Una respuesta manual cambia automáticamente la conversación a HUMAN.</small>
        </form>
      </>}
    </section>
  </main>;
}
