# PREVENT Ecuador - Etapa 0

Infraestructura base lista para iniciar desarrollo del backend clinico y la futura integracion con frontend.

## Estructura

```text
prevent-ecuador/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── dependencies.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── router.py
│   │   └── utils/
│   ├── alembic/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env
├── frontend/
└── docs/
```

## Comandos backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Comandos Alembic

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

## Comandos frontend

```powershell
cd frontend
npm install
npm run dev
```

## Verificacion esperada

- API en `http://localhost:8000`
- Swagger en `http://localhost:8000/docs`
- Healthcheck en `http://localhost:8000/api/v1/health`
- Conexion PostgreSQL preparada por `DATABASE_URL`

## Notas

- No se agrego logica de negocio.
- No se crearon modelos clinicos.
- Alembic quedo enlazado a `Base.metadata` para futuras migraciones.
