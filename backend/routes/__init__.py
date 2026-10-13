from fastapi import APIRouter

from routes import categories, dashboard, health, products, stock, suppliers

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(dashboard.router)
api_router.include_router(products.router)
api_router.include_router(categories.router)
api_router.include_router(suppliers.router)
api_router.include_router(stock.router)
