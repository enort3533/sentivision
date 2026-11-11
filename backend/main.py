import sys
import os
import logging
from contextlib import asynccontextmanager

# Ensure backend directory is on path when run from project root
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from core.config import settings
from database.database import create_tables

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    logging.info("Database tables created/verified")
    yield


app = FastAPI(
    title="SENTIVISION API",
    description="Image-Based Sentiment Analysis API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Ensure tables are initialized at import time as well (for test runners and scripts)
create_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
