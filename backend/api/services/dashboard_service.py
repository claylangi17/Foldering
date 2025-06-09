from ..db.database import get_mysql_connection
from ..schemas.dashboard_schemas import MiniDashboardData
import logging

logger = logging.getLogger(__name__)


def get_mini_dashboard_data() -> MiniDashboardData:
    """
    Fetches and aggregates data for the mini dashboard.
    """
    conn = None
    try:
        conn = get_mysql_connection()
        if not conn:
            logger.error(
                "Failed to connect to the database for dashboard data.")
            # Return default/empty data or raise an exception
            return MiniDashboardData(
                total_purchase_orders=0,
                total_order_amount_idr=0.0,
                total_l1_categories=0,
                total_l2_categories=0
            )

        cursor = conn.cursor(dictionary=True)

        # 1. Total Purchase Orders
        cursor.execute("SELECT COUNT(*) as total_pos FROM purchase_orders")
        total_pos_result = cursor.fetchone()
        total_purchase_orders = total_pos_result['total_pos'] if total_pos_result else 0

        # 2. Total Order Amount IDR
        cursor.execute(
            "SELECT SUM(Order_Amount_IDR) as total_amount FROM purchase_orders")
        total_amount_result = cursor.fetchone()
        total_order_amount_idr = total_amount_result[
            'total_amount'] if total_amount_result and total_amount_result['total_amount'] is not None else 0.0

        # 3. Number of L1 Categories
        # Assuming L1 folders have parent_id IS NULL or a specific marker if you have a root node for L1s
        # Based on systemPatterns.md: L1 has parent_id=NULL and layer_name_db="L1_Parsed_Folders"
        # However, the actual schema for layer_definitions might be simpler:
        # L1: level = 1
        # L2: level = 2
        # Let's assume 'level' column exists in 'layer_definitions'
        cursor.execute(
            "SELECT COUNT(DISTINCT id) as total_l1 FROM layer_definitions WHERE level = 1")
        total_l1_result = cursor.fetchone()
        total_l1_categories = total_l1_result['total_l1'] if total_l1_result else 0

        # 4. Number of L2 Categories
        cursor.execute(
            "SELECT COUNT(DISTINCT id) as total_l2 FROM layer_definitions WHERE level = 2")
        total_l2_result = cursor.fetchone()
        total_l2_categories = total_l2_result['total_l2'] if total_l2_result else 0

        # 5. Number of Pending POs
        cursor.execute("SELECT COUNT(*) as total_pending FROM purchase_orders WHERE PO_Status = 'Pending'")
        pending_pos_result = cursor.fetchone()
        pending_pos = pending_pos_result['total_pending'] if pending_pos_result else 0

        # 6. Number of Completed POs
        cursor.execute("SELECT COUNT(*) as total_completed FROM purchase_orders WHERE PO_Status = 'Completed'")
        completed_pos_result = cursor.fetchone()
        completed_pos = completed_pos_result['total_completed'] if completed_pos_result else 0

        dashboard_data = MiniDashboardData(
            total_purchase_orders=total_purchase_orders,
            total_order_amount_idr=float(
                total_order_amount_idr),  # Ensure float
            total_l1_categories=total_l1_categories,
            total_l2_categories=total_l2_categories,
            pending_pos=pending_pos,
            completed_pos=completed_pos
        )

        logger.info(f"Fetched dashboard data: {dashboard_data}")
        return dashboard_data

    except Exception as e:
        logger.error(f"Error fetching dashboard data: {e}", exc_info=True)
        # Return default/empty data in case of any error
        return MiniDashboardData(
            total_purchase_orders=0,
            total_order_amount_idr=0.0,
            total_l1_categories=0,
            total_l2_categories=0,
            pending_pos=0,
            completed_pos=0
        )
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            logger.debug("Database connection closed for dashboard service.")
