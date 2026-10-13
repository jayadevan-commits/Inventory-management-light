from typing import List

from pydantic import BaseModel

from schemas.product import ProductOut
from schemas.stock import StockTransactionOut


class DashboardOut(BaseModel):
    total_products: int
    total_stock: int
    low_stock_count: int
    out_of_stock_count: int
    restock_list: List[ProductOut]
    recent_transactions: List[StockTransactionOut]
