import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  LockKeyhole,
  MessageCircle,
  MessagesSquare,
  Network,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import { PLANS } from "@/lib/plans";

const plans = [PLANS.starter, PLANS.growth, PLANS.scale];

export function MarketingLanding() {
  return (
    <main className="marketing">
      <header className="marketing-nav">
        <Link href="/" className="marketing-brand">
          <span className="marketing-brandmark">M</span>
          <span>
            <strong>MSJ</strong>
            <small>Conversation Infrastructure</small>
          </span>
        </Link>
        <nav>
          <a href="#producto">Producto</a>
          <a href="#seguridad">Seguridad</a>
          <a href="#precios">Precios</a>
        </nav>
        <div className="marketing-nav-actions">
          <Link href="/login" className="text-link">Entrar</Link>
          <Link href="/login" className="button dark">Probar MSJ <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="hero-copy">
          <span className="signal-label"><i /> INFRAESTRUCTURA DE CONVERSACIÓN</span>
          <h1>Tus clientes escriben en tres lugares. Tu equipo responde desde uno.</h1>
          <p>
            WhatsApp, Instagram y Messenger conectados directamente a sus APIs oficiales.
            IA cuando conviene. Personas cuando importa. Tu canal sigue siendo tuyo.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="button lime">Conectar mi primer canal <ArrowRight size={16} /></Link>
            <a href="#producto" className="button quiet">Ver cómo funciona</a>
          </div>
          <div className="trust-strip">
            <span><ShieldCheck size={15} /> APIs oficiales</span>
            <span><LockKeyhole size={15} /> Tokens cifrados</span>
            <span><Network size={15} /> Sin intermediarios obligatorios</span>
          </div>
        </div>

        <div className="hero-console" aria-label="Vista de MSJ">
          <div className="console-top">
            <span className="console-brand">MSJ / LIVE</span>
            <span className="console-state"><i /> OPERACIONAL</span>
          </div>
          <div className="console-grid">
            <aside>
              <strong>Conversaciones</strong>
              {[
                ["WhatsApp", "María · 1m", "Necesito una hora mañana"],
                ["Instagram", "Taller Norte · 4m", "¿Tienen stock?"],
                ["Messenger", "Camila · 9m", "Quiero cotizar el servicio"],
              ].map(([channel, meta, body]) => (
                <div className="thread-item" key={meta}>
                  <span>{channel}</span>
                  <b>{meta}</b>
                  <p>{body}</p>
                </div>
              ))}
            </aside>
            <div className="conversation-preview">
              <div className="conversation-head">
                <div><strong>María González</strong><span>WhatsApp · AI ACTIVE</span></div>
                <button>Tomar conversación</button>
              </div>
              <div className="bubble inbound">Hola, ¿tienen disponibilidad mañana después de las 5?</div>
              <div className="tool-event"><Workflow size={14}/> consultando disponibilidad…</div>
              <div className="bubble outbound">Sí. Tengo 18:00 y 19:30 disponibles. ¿Cuál prefieres?</div>
              <div className="console-footer">
                <span>IA responde</span><span>Humano decide</span><span>Acciones auditadas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className="marketing-section">
        <div className="section-heading">
          <span className="signal-label">PRODUCTO</span>
          <h2>No es otro chatbot. Es la capa que gobierna tus conversaciones.</h2>
          <p>MSJ separa transporte, inteligencia, operación humana e integraciones para que puedas crecer sin quedar atrapado en una plataforma cerrada.</p>
        </div>
        <div className="feature-grid">
          <article>
            <MessageCircle size={23}/>
            <h3>Meta directo</h3>
            <p>Conecta WhatsApp Cloud API, Instagram Messaging y Messenger sin revender el canal.</p>
          </article>
          <article>
            <Bot size={23}/>
            <h3>IA con herramientas</h3>
            <p>Responde, consulta sistemas y ejecuta acciones mediante conectores explícitos y auditables.</p>
          </article>
          <article>
            <MessagesSquare size={23}/>
            <h3>Inbox humano</h3>
            <p>AI / HUMAN / PAUSED evita respuestas simultáneas y entrega control inmediato al equipo.</p>
          </article>
          <article>
            <Network size={23}/>
            <h3>Conecta cualquier negocio</h3>
            <p>Clinia, CRM, ERP, e-commerce, agenda, inmobiliaria o APIs propias con un protocolo común.</p>
          </article>
          <article>
            <Workflow size={23}/>
            <h3>Automatización</h3>
            <p>Seguimientos, clasificación, asignación y acciones posteriores sin convertir el inbox en un flujo inmanejable.</p>
          </article>
          <article>
            <ShieldCheck size={23}/>
            <h3>Seguridad por diseño</h3>
            <p>RLS, RBAC, HMAC, cifrado de secretos, idempotencia, auditoría y aislamiento por workspace.</p>
          </article>
        </div>
      </section>

      <section className="ownership-band">
        <div>
          <span className="signal-label">TU CANAL, TUS DATOS</span>
          <h2>MSJ no necesita ser dueño de tu WhatsApp para funcionar.</h2>
        </div>
        <p>
          El negocio conecta su propio Meta Business. Los cargos de WhatsApp permanecen en su cuenta.
          MSJ cobra por software, inteligencia y operación, no por apropiarse del canal.
        </p>
      </section>

      <section id="seguridad" className="marketing-section security-section">
        <div className="section-heading compact">
          <span className="signal-label">SEGURIDAD</span>
          <h2>Construido para operar, auditar y contener fallos.</h2>
        </div>
        <div className="security-grid">
          {[
            ["Aislamiento", "Cada tenant se separa por workspace_id y RLS en base de datos."],
            ["Credenciales", "Tokens de Meta e integraciones cifrados con AES-256-GCM."],
            ["Webhooks", "Validación de firma Meta y HMAC en tráfico interno."],
            ["Agente", "Tools permitidas por lista blanca; el modelo nunca recibe acceso SQL genérico."],
            ["Auditoría", "Mensajes, tool calls, cambios de modo y eventos administrativos dejan traza."],
            ["Contención", "Cuotas, idempotencia, rate limits y suspensión por workspace."],
          ].map(([title, body]) => (
            <article key={title}><strong>{title}</strong><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section id="precios" className="marketing-section pricing-section">
        <div className="section-heading">
          <span className="signal-label">PRECIOS</span>
          <h2>Software claro. Meta se cobra aparte.</h2>
          <p>El tráfico de WhatsApp se factura directamente en la cuenta Meta del cliente. MSJ no agrega margen escondido al canal.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={plan.code === "growth" ? "price-card featured" : "price-card"} key={plan.code}>
              {plan.code === "growth" && <span className="recommended">RECOMENDADO</span>}
              <span className="plan-name">{plan.name}</span>
              <div className="price"><strong>{"$"}{plan.monthlyUsd}</strong><span>USD / mes</span></div>
              <p>{plan.activeContacts?.toLocaleString("es-CL")} contactos activos · {plan.aiReplies?.toLocaleString("es-CL")} respuestas IA</p>
              <ul>
                {plan.features.map((feature) => <li key={feature}><Check size={14}/>{feature}</li>)}
              </ul>
              <Link href="/login" className={plan.code === "growth" ? "button lime full" : "button dark full"}>Empezar</Link>
            </article>
          ))}
          <article className="price-card enterprise">
            <span className="plan-name">Enterprise</span>
            <div className="price"><strong>A medida</strong></div>
            <p>Equipos grandes, múltiples workspaces o requisitos de seguridad específicos.</p>
            <ul>
              {PLANS.enterprise.features.map((feature) => <li key={feature}><Check size={14}/>{feature}</li>)}
            </ul>
            <a href="mailto:contacto@deepanalytica.cl" className="button quiet full">Hablar con ventas</a>
          </article>
        </div>
        <p className="pricing-footnote">Los límites de IA se miden como respuestas generadas. El exceso puede cobrarse por bloques; los costos de Meta y proveedores externos no están incluidos.</p>
      </section>

      <section className="cta-band">
        <Sparkles size={24}/>
        <div><h2>Empieza con un canal. Conecta el resto cuando lo necesites.</h2><p>MSJ crece desde una bandeja simple hasta una capa operativa completa.</p></div>
        <Link href="/login" className="button lime">Crear workspace <ArrowRight size={16}/></Link>
      </section>

      <footer className="marketing-footer">
        <div className="marketing-brand">
          <span className="marketing-brandmark">M</span>
          <span><strong>MSJ</strong><small>Conversation Infrastructure</small></span>
        </div>
        <p>Producto de Deep Analytica. WhatsApp, Instagram y Facebook son marcas de Meta Platforms, Inc.</p>
      </footer>
    </main>
  );
}
