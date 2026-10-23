<h1>
  @ffe-senai/smart40
  <br>
<sup>
  Contrato de eventos, bus e dev-tools da Estação SMART 4.0
</sup>
</h1>

Pacote compartilhado pelos módulos da [Estação SMART 4.0](https://github.com/ffe-senai/estacao-smart):

- **Contrato** (`schemaVersion` `0.1.0`): tipos dos eventos da Planta N2 (telemetria da máquina e do robô, rastreabilidade, expedição, comandos simulados e estado da conexão).
- **Bus:** `on` e `emit` sobre `window` com `CustomEvent`, no nome `smart40:<type>`.
- **Dev-tools:** Web Component `<smart40-devtools>` para disparar eventos, ver o log e simular cenários.

> ⚠️ **Contrato preliminar (Sprint 1)**<br>
> Escopo mock/local. **Não** autoriza comandos em CLP, robô ou planta física. Todo `command.requested` deve ter `simulation: true`.

## Instalação

```bash
npm i @ffe-senai/smart40
```

## Uso

```ts
import { on, emit, createEvent } from "@ffe-senai/smart40";

// Assinar: retorna a função que cancela a assinatura
const off = on("machine.telemetry", (event) => {
  console.log(event.data.status);
});

// Publicar: createEvent monta o envelope (schemaVersion, eventId, timestamp, source)
emit(
  createEvent("traceability.piece-scanned", {
    pieceId: "P-0001",
    code: "QR-0001",
    scannedAt: new Date().toISOString(),
    result: "APPROVED",
  }),
);

off();
```

Os tipos do contrato (`Smart40Event`, `MachineTelemetryEvent`, `CommandRequestedEvent`…) são exportados pela mesma entrada.

| Exportação | O que é |
|---|---|
| `on(type, listener)` | Assina um tipo de evento; retorna a função que cancela |
| `emit(event)` | Publica um evento para todos os módulos da página |
| `createEvent(type, data, source?)` | Monta o envelope de um evento (`source` padrão: `"mock"`) |
| `EVENT_TYPES` | Lista de todos os tipos do contrato |
| `EVENT_PREFIX` | `"smart40:"`, prefixo do `CustomEvent` no `window` |

## Dev-tools

```ts
import "@ffe-senai/smart40/dev-tools";
```

```html
<smart40-devtools></smart40-devtools>
```

O componente ocupa todo o container que o recebe. Ele tem:

- **Disparar evento:** tipo, origem (`mock` ou `gateway`) e os dados em JSON, já preenchidos com um exemplo.
- **Cenários:** operação normal, alarme na máquina, emergência, falha no robô, peça rejeitada, comando simulado e conexão perdida.
- **Log:** todos os eventos que passam pelo bus, inclusive os emitidos pelos módulos, com o JSON de cada um.

É HTML, CSS e JS sem framework e sem dependências, com Shadow DOM. As cores usam as variáveis `--smart-*` do tema do App Shell, quando presentes.

## Publicação

O workflow [`publish.yaml`](.github/workflows/publish.yaml) publica no npm a cada tag de versão:

1. Atualize a versão: `npm version 0.2.0` (cria o commit e a tag `v0.2.0`).
2. Envie: `git push --follow-tags`.

A tag precisa bater com a `version` do `package.json`. Versões de pré-release (`0.2.0-beta.1`) vão para a dist-tag `next`.

Requisitos no repositório: o secret `NPM_TOKEN`, um token do npm com permissão de publicação no escopo `@ffe-senai`.

## Desenvolvimento

| Script | Uso |
|---|---|
| `npm run check` | Tipagem TypeScript |
| `npm run build` | Gera o `dist/` |
