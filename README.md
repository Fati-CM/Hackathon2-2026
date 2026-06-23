# Hackathon2-2026

TropelCare Control Room para la hackathon frontend.

## Stack

- React + TypeScript + Vite
- React Router
- Tailwind CSS
- Fetch API

## Instalacion

```bash
npm install
npm run dev
```

Abrir siempre:

```txt
http://localhost:5173
```

No usar Live Server ni `127.0.0.1`, porque el backend del curso permite CORS para `http://localhost:5173`.

## Variables

Crear `.env` tomando como base `.env.example`:

```txt
VITE_API_BASE_URL=https://hackaton-20261-front-587720740455.us-east1.run.app/api/v1
```

Las variables `PG_HOST`, `PG_PORT`, `PG_DB`, `PG_USER` y `PG_PASSWORD` pertenecen al backend/base de datos, no al frontend.

Cada equipo debe iniciar sesion con su propio `TEAM_CODE`, email y password asignados.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
```
