import {
  Bot,
  Cable,
  Instagram,
  MessageCircle,
  MessagesSquare,
  PlugZap,
  Radio,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";

const stats = [
  { label: "Canales", value: "3", detail: "Meta direct" },
  { label: "Conversaciones", value: "0", detail: "esperando tráfico" },
  { label: "Integraciones", value: "1", detail: "Clinia disponible" }
];

const channels = [
  { name: "WhatsApp", icon: MessageCircle, status: "Listo para conectar", detail: "Cloud API oficial" },
  { name: "Instagram", icon: Instagram, status: "Listo para conectar", detail: "Professional Messaging" },
  { name: "Messenger", icon: MessagesSquare, status: "Listo para conectar", detail: "Facebook Pages" }
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandmark">M</div>
          <div>
            <strong>MSJ</strong>
            <span>Omnichannel AI</span>
          </div>
        </div>

        <nav>
          <a className="active"><Radio size={17} /> Operación</a>
          <a><MessagesSquare size={17} /> Conversaciones</a>
          <a><Cable size={17} /> Canales</a>
          <a><Bot size={17} /> Asistente</a>
          <a><PlugZap size={17} /> Integraciones</a>
        </nav>

        <div className="sidebarFoot">
          <ShieldCheck size={16} />
          <span>Producto independiente<br />Multiempresa · API-first</span>
        </div>
      </aside>

      <section className="content">
        <header className="hero">
          <div>
            <span className="eyebrow">CONTROL DE CONVERSACIONES</span>
            <h1>Un solo cerebro.<br />Todos tus mensajes.</h1>
            <p>
              Responde, vende, agenda y deriva conversaciones de WhatsApp,
              Instagram y Facebook sin depender de ManyChat, Twilio ni una vertical específica.
            </p>
          </div>
          <button className="primary"><Cable size={16} /> Conectar primer canal</button>
        </header>

        <div className="stats">
          {stats.map((item) => (
            <article key={item.label} className="stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>

        <div className="grid">
          <section className="panel">
            <div className="panelHead">
              <div>
                <span className="eyebrow">CANALES</span>
                <h2>Entrada omnicanal</h2>
              </div>
              <span className="pill">Meta directo</span>
            </div>

            <div className="channelList">
              {channels.map(({ name, icon: Icon, status, detail }) => (
                <div className="channel" key={name}>
                  <div className="channelIcon"><Icon size={18} /></div>
                  <div>
                    <strong>{name}</strong>
                    <span>{detail}</span>
                  </div>
                  <div className="channelStatus">
                    <i />
                    {status}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panelHead">
              <div>
                <span className="eyebrow">AGENTE</span>
                <h2>Modo de operación</h2>
              </div>
              <span className="pill green">AI / HUMAN</span>
            </div>

            <div className="modeCard">
              <Bot size={22} />
              <div>
                <strong>IA administrativa y comercial</strong>
                <p>Responde con contexto, ejecuta herramientas y entrega a una persona cuando corresponde.</p>
              </div>
            </div>

            <div className="modeCard">
              <UserRoundCheck size={22} />
              <div>
                <strong>Human takeover</strong>
                <p>Una respuesta humana pausa automáticamente al agente para evitar mensajes duplicados.</p>
              </div>
            </div>
          </section>
        </div>

        <section className="panel integrations">
          <div className="panelHead">
            <div>
              <span className="eyebrow">INTEGRACIONES</span>
              <h2>Conecta cualquier software</h2>
            </div>
            <button className="ghost">Nueva integración</button>
          </div>

          <div className="integrationRow">
            <div className="integrationLogo">C</div>
            <div className="integrationCopy">
              <strong>Clinia</strong>
              <span>Conector opcional · agenda, disponibilidad y reservas</span>
            </div>
            <span className="pill green">Disponible</span>
          </div>

          <div className="integrationRow dim">
            <div className="integrationLogo"><PlugZap size={18} /></div>
            <div className="integrationCopy">
              <strong>Custom HTTP API</strong>
              <span>CRM, ERP, inmobiliaria, restaurante o cualquier backend</span>
            </div>
            <span className="pill">Protocolo abierto</span>
          </div>
        </section>
      </section>
    </main>
  );
}
