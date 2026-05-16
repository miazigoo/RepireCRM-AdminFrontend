# RepireCRM Admin Frontend

Современная отдельная панель администратора для центрального сервиса RepireCRM Admin.

## Stack

- React
- TypeScript
- Vite
- lucide-react

## Local

```bash
npm install
npm run dev
```

По умолчанию Vite стартует на `http://127.0.0.1:5174` и проксирует `/api` в `http://127.0.0.1:8050`.

## Environment

```bash
VITE_API_URL=/api
```

Если фронт и API живут на разных доменах, укажи полный URL API:

```bash
VITE_API_URL=https://admin-api.example.com/api
```

## Production Build

```bash
npm run build
```

Docker-образ собирает SPA и отдает ее через nginx. Внутреннее имя API-сервиса в `nginx.conf`: `admin-backend:8050`.

В общем compose из `../RepireCRM-Admin` сервис называется `admin-frontend` и публикуется на `ADMIN_FRONTEND_PORT` (`8051` по умолчанию).
