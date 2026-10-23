import { EVENT_TYPES, createEvent, emit, on, type Smart40EventData, type Smart40EventType } from "./bus.js";
import type { EventSource, Smart40Event } from "./contract.js";

/**
 * <smart40-devtools>: dispara eventos do contrato, mostra o log de tudo que passa pelo bus
 * e simula cenários. Web Component sem framework e sem dependências, com Shadow DOM.
 * Ocupa todo o container que o recebe.
 */

type DataOf<T extends Smart40EventType> = Smart40EventData[T];

const SAMPLES: Smart40EventData = {
  "machine.telemetry": {
    status: "RUNNING",
    mode: "AUTOMATIC",
    emergencyActive: false,
    safetyInterlockOk: true,
    cycleTimeMs: 4200,
    alarmCodes: [],
  },
  "robot.telemetry": {
    jointAnglesDeg: [0, -90, 90, -90, -90, 0],
    cartesianMm: { x: 400, y: 0, z: 300 },
    gripper: "OPEN",
    speedPercent: 50,
    programStatus: "RUNNING",
    programName: "pick_and_place",
  },
  "traceability.piece-scanned": {
    pieceId: "P-0001",
    code: "QR-0001",
    lotId: "L-01",
    scannedAt: new Date().toISOString(),
    result: "APPROVED",
  },
  "expedition.metrics": {
    producedTotal: 120,
    piecesPerMinute: 6,
    outputQueue: 3,
    activeOrders: 2,
    pallet: { currentCount: 8, capacity: 12 },
  },
  "command.requested": {
    commandId: "cmd-0001",
    target: "machine",
    action: "START",
    sourceModule: "ihm",
    simulation: true,
  },
  "command.ack": {
    commandId: "cmd-0001",
    result: "SIMULATED",
    message: "Comando simulado",
  },
  "connection.state": {
    state: "CONNECTED",
    latencyMs: 12,
    lastTelemetryAt: new Date().toISOString(),
  },
};

const send = <T extends Smart40EventType>(type: T, data: Partial<DataOf<T>> = {}) =>
  emit(createEvent(type, { ...SAMPLES[type], ...data }));

const SCENARIOS: { label: string; run: () => void }[] = [
  {
    label: "Operação normal",
    run: () => {
      send("connection.state");
      send("machine.telemetry");
      send("robot.telemetry");
      send("expedition.metrics");
    },
  },
  {
    label: "Alarme na máquina",
    run: () => send("machine.telemetry", { status: "ALARM", alarmCodes: ["A-101"] }),
  },
  {
    label: "Emergência",
    run: () => {
      send("machine.telemetry", { status: "EMERGENCY", emergencyActive: true, safetyInterlockOk: false });
      send("robot.telemetry", { programStatus: "PAUSED", speedPercent: 0 });
    },
  },
  {
    label: "Falha no robô",
    run: () => send("robot.telemetry", { programStatus: "FAULT", speedPercent: 0 }),
  },
  {
    label: "Peça rejeitada",
    run: () =>
      send("traceability.piece-scanned", {
        pieceId: "P-0002",
        code: "QR-0002",
        scannedAt: new Date().toISOString(),
        result: "REJECTED",
        reason: "Código ilegível",
      }),
  },
  {
    label: "Comando simulado",
    run: () => {
      const commandId = `cmd-${Date.now()}`;
      send("command.requested", { commandId });
      setTimeout(() => send("command.ack", { commandId }), 300);
    },
  },
  {
    label: "Conexão perdida",
    run: () => send("connection.state", { state: "DISCONNECTED", latencyMs: undefined }),
  },
];

const MAX_LOG = 200;

const STYLE = /* css */ `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    color: var(--smart-text-primary, #f8fafc);
    background: var(--smart-bg-app, #0f172a);
    font: 13px/1.4 var(--smart-font-family, system-ui, sans-serif);
    container-type: inline-size;
  }
  *, *::before, *::after { box-sizing: inherit; }
  .layout {
    display: grid;
    grid-template-columns: minmax(240px, 340px) 1fr;
    gap: 12px;
    height: 100%;
    padding: 12px;
  }
  @container (max-width: 640px) { .layout { grid-template-columns: 1fr; grid-template-rows: auto 1fr; } }
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    padding: 12px;
    border: 1px solid var(--smart-border-color, #334155);
    border-radius: var(--smart-radius-md, 8px);
    background: var(--smart-bg-surface, #1e293b);
  }
  .side { overflow: auto; }
  h2 {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--smart-text-secondary, #94a3b8);
  }
  label { display: flex; flex-direction: column; gap: 4px; color: var(--smart-text-secondary, #94a3b8); }
  select, textarea, button {
    font: inherit;
    color: inherit;
    background: var(--smart-bg-input, #020617);
    border: 1px solid var(--smart-border-color, #334155);
    border-radius: var(--smart-radius-sm, 4px);
    padding: 6px 8px;
  }
  textarea { min-height: 140px; resize: vertical; font-family: var(--smart-font-mono, ui-monospace, monospace); font-size: 12px; }
  button { cursor: pointer; }
  button:hover { background: var(--smart-bg-surface-hover, #334155); }
  button.primary { background: var(--smart-accent-primary, #0284c7); border-color: transparent; color: #fff; }
  .scenarios { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; }
  .error { min-height: 1.4em; color: var(--smart-status-danger, #ef4444); font-size: 12px; }
  .log-head { display: flex; align-items: center; gap: 8px; }
  .log-head h2 { flex: 1; }
  ol { flex: 1; min-height: 0; margin: 0; padding: 0; overflow: auto; list-style: none; }
  li { border-top: 1px solid var(--smart-border-color, #334155); }
  details > summary { display: flex; gap: 8px; padding: 6px 2px; cursor: pointer; list-style: none; }
  summary::-webkit-details-marker { display: none; }
  .time { color: var(--smart-text-muted, #64748b); font-family: var(--smart-font-mono, ui-monospace, monospace); }
  .type { flex: 1; color: var(--smart-text-digital, #22d3ee); }
  .source { color: var(--smart-text-secondary, #94a3b8); }
  pre {
    margin: 0 0 8px;
    padding: 8px;
    overflow: auto;
    border-radius: var(--smart-radius-sm, 4px);
    background: var(--smart-bg-input, #020617);
    font: 12px/1.4 var(--smart-font-mono, ui-monospace, monospace);
  }
  .empty { padding: 12px 2px; color: var(--smart-text-muted, #64748b); }
`;

const TEMPLATE = /* html */ `
  <div class="layout">
    <section class="side">
      <h2>Disparar evento</h2>
      <label>Tipo <select name="type"></select></label>
      <label>Origem
        <select name="source"><option value="mock">mock</option><option value="gateway">gateway</option></select>
      </label>
      <label>Dados (JSON) <textarea name="data" spellcheck="false"></textarea></label>
      <div class="error" role="alert"></div>
      <button class="primary" name="emit">Emitir</button>

      <h2>Cenários</h2>
      <div class="scenarios"></div>
    </section>

    <section>
      <div class="log-head">
        <h2>Log <span class="count">(0)</span></h2>
        <button name="clear">Limpar</button>
      </div>
      <ol></ol>
    </section>
  </div>
`;

export class Smart40DevTools extends HTMLElement {
  #unsubscribe: (() => void)[] = [];
  #count = 0;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STYLE}</style>${TEMPLATE}`;

    const typeSelect = this.#get<HTMLSelectElement>("select[name=type]");
    const data = this.#get<HTMLTextAreaElement>("textarea[name=data]");
    for (const type of EVENT_TYPES) typeSelect.add(new Option(type, type));
    const fillSample = () => (data.value = JSON.stringify(SAMPLES[typeSelect.value as Smart40EventType], null, 2));
    typeSelect.addEventListener("change", fillSample);
    fillSample();

    this.#get("button[name=emit]").addEventListener("click", () => this.#emitFromForm());
    this.#get("button[name=clear]").addEventListener("click", () => this.#clear());

    const scenarios = this.#get(".scenarios");
    for (const scenario of SCENARIOS) {
      const button = document.createElement("button");
      button.textContent = scenario.label;
      button.addEventListener("click", scenario.run);
      scenarios.append(button);
    }
    this.#clear();
  }

  connectedCallback() {
    this.#unsubscribe = EVENT_TYPES.map((type) => on(type, (event) => this.#log(event)));
  }

  disconnectedCallback() {
    this.#unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribe = [];
  }

  #get<E extends Element = HTMLElement>(selector: string): E {
    return this.shadowRoot!.querySelector<E>(selector)!;
  }

  #emitFromForm() {
    const error = this.#get(".error");
    const type = this.#get<HTMLSelectElement>("select[name=type]").value as Smart40EventType;
    const source = this.#get<HTMLSelectElement>("select[name=source]").value as EventSource;
    try {
      const data = JSON.parse(this.#get<HTMLTextAreaElement>("textarea[name=data]").value);
      error.textContent = "";
      emit(createEvent(type, data, source));
    } catch (e) {
      error.textContent = `JSON inválido: ${(e as Error).message}`;
    }
  }

  #log(event: Smart40Event) {
    const list = this.#get("ol");
    list.querySelector(".empty")?.remove();

    const item = document.createElement("li");
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const field = (className: string, text: string) => {
      const span = document.createElement("span");
      span.className = className;
      span.textContent = text;
      return span;
    };
    summary.append(
      field("time", new Date(event.timestamp).toLocaleTimeString()),
      field("type", event.type),
      field("source", event.source),
    );
    const json = document.createElement("pre");
    json.textContent = JSON.stringify(event, null, 2);
    details.append(summary, json);
    item.append(details);

    list.prepend(item);
    while (list.children.length > MAX_LOG) list.lastElementChild!.remove();
    this.#setCount(this.#count + 1);
  }

  #clear() {
    const list = this.#get("ol");
    list.replaceChildren();
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Nenhum evento ainda. Dispare um evento ou um cenário.";
    list.append(empty);
    this.#setCount(0);
  }

  #setCount(count: number) {
    this.#count = count;
    this.#get(".count").textContent = `(${count})`;
  }
}

if (!customElements.get("smart40-devtools")) customElements.define("smart40-devtools", Smart40DevTools);

declare global {
  interface HTMLElementTagNameMap {
    "smart40-devtools": Smart40DevTools;
  }
}
