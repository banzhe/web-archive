# Contribute

## Technology Stack

This is a TypeScript full-stack project deployed on Cloudflare Pages.

### Frontend and Browser Plugin

- Framework: React
- Build Tool: Vite
- Style: TailwindCSS
- UI Library: Shadcn UI

### Backend

- Framework: Hono
- Database: D1 + Raw SQL
- Storage: R2

## Development Environment Setup

First, you need to install node.js (v20+) and pnpm.

### Service Development

- Fork the code, then use `pnpm install` to install dependencies.
- Execute `pnpm init:local` to initialize the local environment.
- Execute `pnpm dev:server` to start the backend service.
- Execute `pnpm dev:web` to start the frontend service.

### Browser Plugin Development

- Execute `pnpm dev:plugin` to start the browser plugin development environment.

## Commit Code

Currently, there are no restrictions on branch names and PR titles, as long as they are understandable.