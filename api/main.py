from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # Import CORS Middleware
from dotenv import load_dotenv
# Import routers
from .routers import etl_ml_router, po_router, classification_router, auth_router, dashboard_router
import uvicorn
import os

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="Purchase Order Classification API",
    description="API for managing and classifying purchase order data.",
    version="0.1.0"
)

# Add CORS middleware
# Origins to allow, "*" allows all for development.
# For production, specify your frontend domain(s).
origins = [
    "http://localhost:3000",  # Next.js frontend
    "http://localhost",      # Potentially for other local tools
    # Add other origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Can be ["*"] for all origins during development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)


@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Purchase Order Classification API!"}

# Import routers
app.include_router(etl_ml_router.router)
app.include_router(po_router.router)
app.include_router(classification_router.router)
app.include_router(auth_router.router)
app.include_router(dashboard_router.router)  # Include the dashboard router

if __name__ == "__main__":
    api_host = os.getenv("API_HOST", "0.0.0.0")
    api_port = int(os.getenv("API_PORT", "8000"))

    print(f"Starting Uvicorn server on {api_host}:{api_port}")
    uvicorn.run(app, host=api_host, port=api_port)
