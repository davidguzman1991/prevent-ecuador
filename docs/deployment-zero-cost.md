# PREVENT Ecuador - despliegue costo cero

Arquitectura objetivo para MVP:

- Frontend: Vercel con Next.js.
- Backend: FastAPI ligero en Vercel Python/API.
- Base de datos: Supabase PostgreSQL.
- Railway: no usado.
- PDF backend: desactivado temporalmente; se usa impresion del navegador.

## Estructura de despliegue recomendada

Usar dos proyectos Vercel separados dentro del mismo repositorio:

- Proyecto backend: root directory `backend`.
- Proyecto frontend: root directory `frontend`.

Esto evita mezclar el build de Next.js con el runtime Python. El backend expone `backend/api/index.py`, que importa la app ASGI desde `app.main`.

## Variables backend

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
PREVENT_ADMIN_API_KEY=clave-larga-aleatoria
FRONTEND_ORIGINS=https://tu-frontend.vercel.app,http://localhost:3000,http://localhost:3001
```

Notas:

- Para Supabase, usar la cadena de conexion PostgreSQL compatible con SQLAlchemy y el driver `psycopg`.
- En Supabase, normalmente se copia la URI desde Project Settings -> Database -> Connection string. Cambiar el prefijo a `postgresql+psycopg://` si Supabase entrega `postgresql://`.
- Mantener `sslmode=require` para conexiones externas desde Vercel.
- `PREVENT_ADMIN_API_KEY` protege listado, detalle y exportacion de registros.
- El frontend debe enviar la clave en el header `X-Admin-API-Key`.
- No ejecutar migraciones automaticamente en Vercel en esta fase.

## Variables frontend

```env
NEXT_PUBLIC_API_URL=https://tu-backend.vercel.app
```

## Estado de PDF

La generacion PDF con WeasyPrint queda fuera del MVP gratuito. El reporte se imprime desde HTML con `window.print()`, permitiendo "Guardar como PDF" desde el navegador.

## Backend Vercel

Archivos relevantes:

- `backend/api/index.py`: entrypoint ASGI para Vercel.
- `backend/vercel.json`: enruta todas las solicitudes al entrypoint FastAPI.
- `backend/requirements.txt`: dependencias Python que Vercel instala.
- `backend/.vercelignore`: excluye venv, tests y Alembic del bundle serverless.

Configuracion en Vercel:

1. Crear proyecto nuevo apuntando al repositorio.
2. Definir Root Directory: `backend`.
3. Framework preset: Other / Python autodetect.
4. Variables de entorno: `DATABASE_URL`, `PREVENT_ADMIN_API_KEY`, `FRONTEND_ORIGINS`.
5. Deploy.

## Frontend Vercel

Configuracion en Vercel:

1. Crear proyecto nuevo apuntando al mismo repositorio.
2. Definir Root Directory: `frontend`.
3. Framework preset: Next.js.
4. Variable de entorno: `NEXT_PUBLIC_API_URL=https://tu-backend.vercel.app`.
5. Deploy.

Despues del primer deploy del frontend, agregar el dominio real a `FRONTEND_ORIGINS` del backend:

```env
FRONTEND_ORIGINS=https://tu-frontend.vercel.app,http://localhost:3000,http://localhost:3001
```

## Supabase

1. Crear proyecto Supabase.
2. Copiar la connection string de PostgreSQL.
3. Configurar `DATABASE_URL` en backend Vercel.
4. Correr migraciones localmente contra Supabase:

```powershell
cd backend
$env:DATABASE_URL="postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
alembic upgrade head
```

No se configuran migraciones automaticas en Vercel todavia.
