# Live Sports Dashboard

Монорепозиторий на pnpm workspaces.

- `backend` — Express 5 + TypeScript (запускается напрямую через Node, без сборки)
- `frontend` — клиентское приложение
- `packages/shared` — общие типы, схемы и утилиты

## Требования

- Node.js 24 (`nvm use`)
- pnpm 11
- Docker — для локального Postgres

## Запуск

```sh
pnpm install
cp backend/.env.example backend/.env
pnpm db:up
pnpm dev
```

Backend поднимается на `http://localhost:8000`, проверка — `GET /health`.

## Скрипты

| Команда           | Что делает                        |
| ----------------- | --------------------------------- |
| `pnpm dev`        | запускает все `dev:*` параллельно |
| `pnpm lint`       | ESLint во всех пакетах            |
| `pnpm typecheck`  | `tsc --noEmit` во всех пакетах    |
| `pnpm format`     | проверка форматирования Prettier  |
| `pnpm format:fix` | исправление форматирования        |
| `pnpm db:up`      | поднимает Postgres в Docker       |
| `pnpm db:down`    | останавливает Postgres            |

## Drizzle Studio

Просмотр и правка данных в локальной БД через браузер. Postgres должен быть запущен (`pnpm db:up`).

```sh
pnpm --filter @live-sports-dashboard/backend db:studio
```

Из папки `backend` — `pnpm db:studio`. После старта откройте `https://local.drizzle.studio`, остановка — `Ctrl+C`. `DATABASE_URL` берётся из `backend/.env`.

Версии общих зависимостей заданы в `catalog` в `pnpm-workspace.yaml`.
