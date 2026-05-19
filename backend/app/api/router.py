from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.prevent_records import router as prevent_records_router


api_router = APIRouter()
api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(
    prevent_records_router,
    prefix="/prevent-records",
    tags=["Prevent Records"],
)
