from typing import List, Optional, Dict, Any
from ..db.database import get_mysql_connection
# Assuming FrontendLayerNode structure is what we want to return,
# or we define a similar Pydantic schema for API response.
# from ..schemas.classification_schemas import LayerNode as LayerNodeSchema # If defined

# For now, let's define a simple structure for what the DB might hold or how we aggregate it.
# The 'item_classifications' table currently stores: item_po_id, item_description, cluster_label, layer_name

CLASSIFICATIONS_TABLE_NAME = "item_classifications"
DEFINITIONS_TABLE_NAME = "layer_definitions"


def fetch_distinct_layers_from_db(
    layer_level_to_fetch: int,  # 1 for L1, 2 for L2
    # Primary key (id) of the parent in layer_definitions
    parent_layer_definition_pk: Optional[int] = None
    # Returns {"parent_name": Optional[str], "layers": List[Dict[str, Any]]}
) -> Dict[str, Any]:
    """
    Fetches distinct layer categories (nodes) from the layer_definitions table.
    If parent_layer_definition_pk is provided, also fetches the name of the parent layer.
    For L1, parent_layer_definition_pk should be None.
    For L2, parent_layer_definition_pk is the 'id' of the parent L1 layer_definition.
    Calculates item_count for each layer node.
    """
    conn = get_mysql_connection()
    default_response = {"parent_name": None, "layers": []}
    if not conn:
        print("ClassificationService: DB connection failed.")
        return default_response

    cursor = conn.cursor(dictionary=True)
    results = []
    params = []
    full_query = ""
    parent_name: Optional[str] = None

    if parent_layer_definition_pk is not None:
        # Fetch parent name if parent_layer_definition_pk is provided
        try:
            cursor.execute(
                f"SELECT descriptive_name FROM {DEFINITIONS_TABLE_NAME} WHERE id = %s",
                (parent_layer_definition_pk,)
            )
            parent_row = cursor.fetchone()
            if parent_row:
                parent_name = parent_row["descriptive_name"]
        except Exception as e:
            print(
                f"ClassificationService: Error fetching parent layer name for PK {parent_layer_definition_pk}: {e}")
            # Not returning early, just parent_name might be None

    if parent_layer_definition_pk is None:  # Fetching L1 definitions
        # For L1, item_count is the number of L2 children
        full_query = f"""
            SELECT
                l1.id,
                l1.descriptive_name AS name,
                l1.parent_layer_id,
                (SELECT COUNT(DISTINCT l2.id) FROM {DEFINITIONS_TABLE_NAME} l2 WHERE l2.parent_layer_id = l1.id AND l2.layer_name_db = 'L2_Parsed_Folders') AS item_count
            FROM {DEFINITIONS_TABLE_NAME} l1
            WHERE l1.parent_layer_id IS NULL AND l1.layer_name_db = 'L1_Parsed_Folders'
            GROUP BY l1.id, l1.descriptive_name, l1.parent_layer_id
            ORDER BY l1.descriptive_name
        """
        # No params needed for this L1 query
    # Fetching L2 definitions (children of an L1)
    elif layer_level_to_fetch == 2:
        # For L2, item_count is the number of distinct PO items under this L2 folder
        full_query = f"""
            SELECT
                ld.id,
                ld.descriptive_name AS name,
                ld.parent_layer_id,
                COUNT(DISTINCT ic.item_po_id) AS item_count
            FROM {DEFINITIONS_TABLE_NAME} ld
            LEFT JOIN {CLASSIFICATIONS_TABLE_NAME} ic ON ld.cluster_label_id = ic.cluster_label AND ic.layer_name = 'L2_Parsed_Folders'
            WHERE ld.parent_layer_id = %s AND ld.layer_name_db = 'L2_Parsed_Folders'
            GROUP BY ld.id, ld.descriptive_name, ld.parent_layer_id
            ORDER BY ld.descriptive_name
        """
        params.append(parent_layer_definition_pk)
    # Add logic for L3 if it were to be re-introduced with parsing.
    # For now, the user's request implies L2 is the final folder before item list.
    # So, layer_level_to_fetch == 3 (items) is handled by fetch_items_for_layer_from_db
    else:  # Should not happen if UI calls correctly for L1 or L2 nodes
        print(
            f"ClassificationService: Unexpected layer_level_to_fetch: {layer_level_to_fetch} with parent_pk: {parent_layer_definition_pk}")
        # Ensure cursor and connection are closed in this path too
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
        return default_response  # Return default response structure

    try:
        print(
            f"ClassificationService: Executing query for layers: {full_query} with params: {params}")
        cursor.execute(full_query, params)
        raw_results = cursor.fetchall()

        for row in raw_results:
            results.append({
                "id": str(row["id"]),  # This is layer_definitions.id (PK)
                "name": str(row["name"]),
                "item_count": int(row["item_count"]),
                "level": layer_level_to_fetch,
                # parent_id is the PK of the parent in layer_definitions
                "parent_id": str(row["parent_layer_id"]) if row["parent_layer_id"] is not None else None
            })
        print(
            f"ClassificationService: Fetched {len(results)} layer categories for level {layer_level_to_fetch}, parent_pk {parent_layer_definition_pk}.")
    except Exception as e:
        print(f"ClassificationService: Error fetching layer categories: {e}")
        # results will be empty, parent_name might be set or None
    finally:
        if cursor:  # Check if cursor was initialized
            cursor.close()
        if conn and conn.is_connected():  # Check if connection is still open
            conn.close()

    return {"parent_name": parent_name, "layers": results}


def fetch_items_for_layer_from_db(layer_definition_pk: int) -> Dict[str, Any]:
    """
    Fetches item details (POs) that belong to a specific layer definition,
    and the name of the layer itself.
    The layer_definition_pk is the primary key 'id' from the 'layer_definitions' table.
    Returns a dictionary: {"layer_name": str, "items": List[Dict[str, Any]]}
    """
    conn = get_mysql_connection()
    default_response = {"layer_name": "Unknown Layer", "items": []}
    if not conn:
        print("ClassificationService: DB connection failed for fetching items.")
        return default_response

    cursor = conn.cursor(dictionary=True)
    items = []
    layer_descriptive_name = "Unknown Layer"

    # 1. Get layer_name_db, cluster_label_id, and descriptive_name from layer_definitions table
    get_layer_info_query = f"SELECT layer_name_db, cluster_label_id, descriptive_name FROM {DEFINITIONS_TABLE_NAME} WHERE id = %s"
    try:
        cursor.execute(get_layer_info_query, (layer_definition_pk,))
        layer_info = cursor.fetchone()
    except Exception as e:
        print(
            f"ClassificationService: Error fetching layer definition info for PK {layer_definition_pk}: {e}")
        cursor.close()
        conn.close()
        return default_response

    if not layer_info:
        print(
            f"ClassificationService: No layer definition found for PK {layer_definition_pk}")
        cursor.close()
        conn.close()
        return default_response

    target_layer_name_db = layer_info["layer_name_db"]
    target_cluster_label_id = layer_info["cluster_label_id"]
    # Get the descriptive name
    layer_descriptive_name = layer_info["descriptive_name"]

    # 2. Fetch items from purchase_orders joined with item_classifications
    # Ensure column names like ITEM_NAME are correct for purchase_orders table.
    # Based on etl_script.py, it's 'ITEM' and 'ITEM_DESC'.
    query_items = f"""
        SELECT 
            po.id, 
            po.PO_No,
            po.ITEM AS ITEM_NAME, 
            po.ITEM_DESC,
            po.Supplier_Name,
            po.QTY_ORDER,
            po.Original_PRICE AS ITEM_PRICE,
            po.Currency AS ITEM_CURRENCY,
            po.TGL_PO,
            po.PR_No,
            po.UNIT,
            po.PR_Date,
            po.PR_Ref_A,
            po.PR_Ref_B,
            po.Term_Payment_at_PO,
            po.RECEIVED_DATE,
            po.Sum_of_Order_Amount_IDR,
            po.Total_Cumulative_QTY_Order, -- This is global cumulative, not per item
            po.Total_Cumulative_IDR_Amount, -- This is global cumulative, not per item
            po.Checklist,
            po.Keterangan,
            SUM(po.QTY_ORDER) OVER (PARTITION BY po.ITEM ORDER BY po.TGL_PO ASC, po.id ASC ROWS UNBOUNDED PRECEDING) AS Cumulative_Item_QTY,
            SUM(po.Sum_of_Order_Amount_IDR) OVER (PARTITION BY po.ITEM ORDER BY po.TGL_PO ASC, po.id ASC ROWS UNBOUNDED PRECEDING) AS Cumulative_Item_Amount_IDR
        FROM purchase_orders po
        JOIN {CLASSIFICATIONS_TABLE_NAME} ic ON po.id = ic.item_po_id
        WHERE ic.layer_name = %s AND ic.cluster_label = %s
        ORDER BY po.TGL_PO DESC, po.id DESC 
        LIMIT 100 -- Consider pagination in the future. Note: Window functions are applied before LIMIT.
    """
    params_items = (target_layer_name_db, target_cluster_label_id)

    try:
        print(
            f"ClassificationService: Executing query for items: {query_items} with params: {params_items}")
        cursor.execute(query_items, params_items)
        raw_items = cursor.fetchall()

        for row in raw_items:
            # Map to the Pydantic model (PurchaseOrder / PurchaseOrderBase) fields
            items.append({
                "id": row.get("id"),
                "PO_No": str(row.get("PO_No") or ""),
                "ITEM": str(row.get("ITEM_NAME") or ""),
                "ITEM_DESC": str(row.get("ITEM_DESC") or ""),
                "Supplier_Name": str(row.get("Supplier_Name") or ""),
                "QTY_ORDER": row.get("QTY_ORDER"),
                "Original_PRICE": row.get("ITEM_PRICE"),
                "Currency": str(row.get("ITEM_CURRENCY") or ""),
                "TGL_PO": row.get("TGL_PO"),
                "PR_No": str(row.get("PR_No") or ""),
                "UNIT": str(row.get("UNIT") or ""),
                "PR_Date": row.get("PR_Date"),
                "PR_Ref_A": str(row.get("PR_Ref_A") or ""),
                "PR_Ref_B": str(row.get("PR_Ref_B") or ""),
                "Term_Payment_at_PO": str(row.get("Term_Payment_at_PO") or ""),
                "RECEIVED_DATE": row.get("RECEIVED_DATE"),
                "Sum_of_Order_Amount_IDR": row.get("Sum_of_Order_Amount_IDR"),
                # Keep existing global cumulative
                "Total_Cumulative_QTY_Order": row.get("Total_Cumulative_QTY_Order"),
                # Keep existing global cumulative
                "Total_Cumulative_IDR_Amount": row.get("Total_Cumulative_IDR_Amount"),
                # Add new per-item cumulative
                "Cumulative_Item_QTY": row.get("Cumulative_Item_QTY"),
                # Add new per-item cumulative
                "Cumulative_Item_Amount_IDR": row.get("Cumulative_Item_Amount_IDR"),
                "Checklist": bool(row.get("Checklist")) if row.get("Checklist") is not None else None,
                "Keterangan": str(row.get("Keterangan") or "")
            })
        print(
            f"ClassificationService: Fetched {len(items)} items for layer definition PK '{layer_definition_pk}' (layer_name: '{target_layer_name_db}', cluster: '{target_cluster_label_id}').")
    except Exception as e:
        print(
            f"ClassificationService: Error fetching items for layer definition PK '{layer_definition_pk}': {e}")
    finally:
        cursor.close()
        conn.close()

    return {"layer_name": layer_descriptive_name, "items": items}
