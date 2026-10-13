from typing import Literal, Optional

from fastapi import APIRouter, Query

from schemas.common import ApiResponse, PageData
from schemas.stock import StockAdjustment, StockAdjustmentResult, StockTransactionOut
from services import stock_service
from utils.responses import ERROR_RESPONSES, ok

router = APIRouter(prefix="/stock", tags=["Stock"], responses=ERROR_RESPONSES)


@router.post(
    "/adjust",
    response_model=ApiResponse[StockAdjustmentResult],
    summary="Add (IN) or remove (OUT) stock",
)
def adjust_stock(body: StockAdjustment):
    message = "Stock added successfully" if body.transaction_type == "IN" else "Stock removed successfully"
    return ok(stock_service.adjust_stock(body), message)


@router.get(
    "/transactions",
    response_model=ApiResponse[PageData[StockTransactionOut]],
    summary="Stock transaction history",
)
def list_transactions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    product_id: Optional[int] = Query(None, ge=1),
    transaction_type: Optional[Literal["IN", "OUT"]] = None,
):
    data = stock_service.list_transactions(page, page_size, product_id, transaction_type)
    return ok(data, "Stock transactions retrieved successfully")
