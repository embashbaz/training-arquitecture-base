# Architecture Training

Placeholder monorepo for architecture training.

## Stack

| App | Tech | Default URL |
| --- | --- | --- |
| `apps/frontend` | Next.js | http://localhost:3000 |
| `apps/backend` | NestJS | http://localhost:3001 |

Package manager: **pnpm** (workspaces).

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/installation) 10+

```bash
# enable pnpm via corepack (recommended)
corepack enable
corepack prepare pnpm@10.14.0 --activate
```

## Setup

```bash
pnpm install
```

## Run

Start both apps in parallel:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:frontend   # Next.js → http://localhost:3000
pnpm dev:backend    # NestJS  → http://localhost:3001
```

Quick check that the API is up:

```bash
curl http://localhost:3001
# → Hello World!
```

## Build

```bash
pnpm build
```

## Structure

```text
arquitecture-training/
├── apps/
│   ├── frontend/   # Next.js
│   └── backend/    # NestJS
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Notes

This repo is intentionally minimal — a starting point for training exercises.
