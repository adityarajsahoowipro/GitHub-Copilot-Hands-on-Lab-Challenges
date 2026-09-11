"""FastAPI application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import APP_NAME, STATIC_DIR, ensure_data_files
from app.routers import api_dashboard, api_incidents, api_rca, api_sla, web


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_data_files()
    yield


app = FastAPI(
    title=APP_NAME,
    description="Incident tracking, lifecycle management, RCA reporting and SLA monitoring.",
    version="0.1.0",
    lifespan=lifespan,
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.include_router(api_incidents.router)
app.include_router(api_rca.router)
app.include_router(api_sla.router)
app.include_router(api_dashboard.router)
app.include_router(web.router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "app": APP_NAME}
