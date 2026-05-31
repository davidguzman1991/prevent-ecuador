from fastapi import APIRouter

from app.api.routes.admin_prevent_records import router as admin_prevent_records_router
from app.api.routes.auth import router as auth_router
from app.api.routes.doctor_prevent_records import router as doctor_prevent_records_router
from app.api.routes.health import router as health_router
from app.api.routes.prevent_records import router as prevent_records_router


api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(
    doctor_prevent_records_router,
    prefix="/doctor/prevent-records",
    tags=["Doctor Prevent Records"],
)
api_router.include_router(
    admin_prevent_records_router,
    prefix="/admin/prevent-records",
    tags=["Admin Prevent Records"],
)
api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(
    prevent_records_router,
    prefix="/prevent-records",
    tags=["Prevent Records"],
)
