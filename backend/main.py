from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routes import route
import os

app = FastAPI(docs_url="/docs", redoc_url="/redoc")

app.add_middleware(
     CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000"],  # Ajoute d'autres origines si nécessaire
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes (GET, POST, etc.)
    allow_headers=["*"],  # Autorise tous les en-têtes (incluant Authorization)
)

#creation des tables dans la base de données
Base.metadata.create_all(bind=engine)

frontend_path = os.path.join(os.path.dirname(__file__),"../frontend")

# inclure les routes
app.include_router(route.router)

app.mount("/workflow", StaticFiles(directory=frontend_path), name=None)
