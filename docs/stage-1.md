# PREVENT Ecuador - Etapa 1

Persistencia inicial del score PREVENT con modelo clinico base, endpoint de creacion y soporte de migraciones.

## Comandos

```powershell
cd c:\Users\Usuario\prevent-ecuador\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic revision --autogenerate -m "create prevent_records table"
alembic upgrade head
uvicorn app.main:app --reload
```

## Endpoint

- `POST http://localhost:8000/api/prevent-records/`

## Swagger

- `http://localhost:8000/docs`

## Payload minimo de prueba

```json
{
  "patient_age": 58,
  "patient_sex": "female",
  "physician_name": "Dra. Ana Perez",
  "physician_specialty": "Cardiologia"
}
```
