from pydantic import BaseModel


class MiniDashboardData(BaseModel):
    total_purchase_orders: int
    total_order_amount_idr: float
    total_l1_categories: int
    total_l2_categories: int

    class Config:
        from_attributes = True
