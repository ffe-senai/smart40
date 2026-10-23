import { SCHEMA_VERSION, type EventSource, type Smart40Event } from "./contract.js";

/** Prefixo dos eventos no `window`: cada evento do contrato é despachado como `smart40:<type>`. */
export const EVENT_PREFIX = "smart40:";

export type Smart40EventType = Smart40Event["type"];
export type Smart40EventOf<T extends Smart40EventType> = Extract<Smart40Event, { type: T }>;
/** Dados (`data`) de cada tipo de evento. */
export type Smart40EventData = { [E in Smart40Event as E["type"]]: E["data"] };

/** Todos os tipos de evento do contrato (útil para assinar tudo, como faz o dev-tools). */
export const EVENT_TYPES = [
  "machine.telemetry",
  "robot.telemetry",
  "traceability.piece-scanned",
  "expedition.metrics",
  "command.requested",
  "command.ack",
  "connection.state",
] as const satisfies readonly Smart40EventType[];

// Falha na compilação se um tipo do contrato ficar de fora de EVENT_TYPES.
const _everyType: Record<Exclude<Smart40EventType, (typeof EVENT_TYPES)[number]>, never> = {};
void _everyType;

/** Publica um evento para todos os módulos da página. */
export function emit(event: Smart40Event): void {
  window.dispatchEvent(new CustomEvent(EVENT_PREFIX + event.type, { detail: event }));
}

/** Assina um tipo de evento. Retorna a função que cancela a assinatura. */
export function on<T extends Smart40EventType>(type: T, listener: (event: Smart40EventOf<T>) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<Smart40EventOf<T>>).detail);
  window.addEventListener(EVENT_PREFIX + type, handler);
  return () => window.removeEventListener(EVENT_PREFIX + type, handler);
}

/** Monta o envelope (schemaVersion, eventId, timestamp, source) em volta dos dados de um evento. */
export function createEvent<T extends Smart40EventType>(
  type: T,
  data: Smart40EventData[T],
  source: EventSource = "mock",
): Smart40EventOf<T> {
  return {
    schemaVersion: SCHEMA_VERSION,
    eventId: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    source,
    data,
  } as Smart40EventOf<T>;
}
