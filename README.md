<h1 align="center">Console</h1>

<p align="center"><b>A self-hostable, managed agent service for long-running infrastructure work.</b></p>



Console runs AI agents inside pluggable sandboxes (Docker / Modal / local), orchestrated by Temporal, with a durable, replayable event log in Postgres and live streaming over NATS + SSE. Multi-cloud object storage, pgvector RAG, GitHub App integration, and scheduled tasks are built in.

## Stack

- **Runtime** — Bun + TypeScript
- **API** — Hono
- **Web** — React + Vite
- **Orchestration** — Temporal
- **Datastore** — Postgres + pgvector (Drizzle ORM)
- **Eventing** — NATS + SSE
- **Agents** — OpenAI Agents SDK
- **Sandboxes** — Docker / Modal / local

## Quick start

```bash
bun install
bun run dev    # starts docker infra, runs migrations, then api + worker + web
```

