from ..schemas.po_schemas import PurchaseOrderCreate as PurchaseOrderCreateSchema
from ..schemas.po_schemas import PurchaseOrderUpdate as PurchaseOrderUpdateSchema
from typing import List, Optional, Dict, Any
from ..db.database import get_mysql_connection
# We'll use the schemas defined earlier
# Renaming to avoid conflict
from ..schemas.po_schemas import PurchaseOrder as PurchaseOrderSchema

# Note: The table name and column names must match your actual MySQL table.
# The `purchase_orders` table is assumed to be created by the ETL script.
TABLE_NAME = "purchase_orders"


def fetch_all_pos_from_db(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    company_code: Optional[int] = None,
    # layer_filter: Optional[str] = None, # TODO: Implement layer filtering
    # month_filter: Optional[int] = None # TODO: Implement month filtering
) -> List[Dict[str, Any]]:  # Returning list of dicts for now
    """
    Fetches purchase orders from the MySQL database with pagination and search.
    """
    conn = get_mysql_connection()
    if not conn:
        # Consider raising an HTTPException or returning an empty list with an error message
        return []

    # dictionary=True returns rows as dicts
    cursor = conn.cursor(dictionary=True)

    query_params = []
    base_query = f"SELECT * FROM {TABLE_NAME}"
    conditions = []

    if search:
        # Assuming search applies to ITEM_NAME and PO_No for now
        # Adjust column names if they are different in your DB
        conditions.append("(ITEM_NAME LIKE %s OR PO_No LIKE %s)")
        query_params.extend([f"%{search}%", f"%{search}%"])
        
    # Filter by company_code if provided
    if company_code:
        conditions.append("company_code = %s")
        query_params.append(company_code)

    # TODO: Add layer_filter logic. This will require joining with layer tables
    # if layer_filter:
    #     conditions.append("layer_column = %s") # Example
    #     query_params.append(layer_filter)

    # TODO: Add month_filter logic. This will require date functions on TGL_PO
    # if month_filter:
    #     conditions.append("MONTH(TGL_PO) = %s") # Example for MySQL
    #     query_params.append(month_filter)

    if conditions:
        base_query += " WHERE " + " AND ".join(conditions)

    # Using PO_No for secondary sort as 'id' might not be a guaranteed auto-increment primary key
    # from the ETL process unless explicitly defined. TGL_PO should exist.
    base_query += " ORDER BY TGL_PO DESC, PO_No DESC"
    base_query += " LIMIT %s OFFSET %s"
    query_params.extend([limit, skip])

    pos = []
    try:
        print(f"Executing DB query: {base_query} with params: {query_params}")
        cursor.execute(base_query, tuple(query_params))
        pos = cursor.fetchall()
        print(f"Fetched {len(pos)} POs from database.")
    except Exception as e:
        print(f"Error fetching POs from database: {e}")
        # Handle error appropriately
    finally:
        cursor.close()
        conn.close()

    return pos


def fetch_po_by_id_from_db(po_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetches a single purchase order by its ID from the MySQL database.
    """
    conn = get_mysql_connection()
    if not conn:
        return None

    cursor = conn.cursor(dictionary=True)
    query = f"SELECT * FROM {TABLE_NAME} WHERE id = %s"
    po = None
    try:
        cursor.execute(query, (po_id,))
        po = cursor.fetchone()
        if po:
            print(f"Fetched PO with id {po_id} from database.")
        else:
            print(f"No PO found with id {po_id} in database.")
    except Exception as e:
        print(f"Error fetching PO by id {po_id} from database: {e}")
    finally:
        cursor.close()
        conn.close()

    return po


def create_po_in_db(po_data: PurchaseOrderCreateSchema) -> Optional[Dict[str, Any]]:
    """
    Creates a new purchase order in the database.
    Note: This function assumes that the PO data provided is complete and valid
    as per the columns in the 'purchase_orders' table that are not auto-generated (like id).
    The ETL process is the primary way POs are created. This function might be for manual additions if allowed.
    """
    conn = get_mysql_connection()
    if not conn:
        return None

    cursor = conn.cursor(dictionary=True)

    # Convert Pydantic model to dict. Ensure all fields required by DB are present.
    # The PurchaseOrderCreateSchema should ideally mirror the fields expected by the DB for a new entry.
    # We need to be careful about which fields are part of PurchaseOrderCreateSchema vs. PurchaseOrderBase
    # For now, let's assume po_data contains all necessary fields that are not auto-incrementing.

    # Get columns from the schema that are present in po_data
    data_dict = po_data.dict(exclude_unset=True)

    # Ensure all fields from PurchaseOrderCreateSchema are included, even if default
    # This might need adjustment based on how PurchaseOrderCreateSchema is defined
    # and what the DB table expects.
    # For example, if 'TGL_PO' is not in PurchaseOrderCreateSchema but required by DB, this will fail.
    # The current PurchaseOrderCreateSchema in po_schemas.py is a bit minimal.
    # It inherits from PurchaseOrderBase, so it should have many fields.

    # Use keys from the provided data
    columns = [col for col in data_dict.keys()]

    # A more robust way would be to define the insertable columns explicitly
    # or derive them from the PurchaseOrderCreateSchema more carefully.
    # Example: columns = ['PO_No', 'ITEM_NAME', 'QTY_ORDER', 'IDR_PRICE', 'Supplier_Name', ...]
    # Ensure these match your DB table columns.

    if not columns:
        print("No data provided to create PO.")
        return None

    placeholders = ", ".join(["%s"] * len(columns))
    cols_joined = ", ".join([f"`{col}`" for col in columns])
    values = [data_dict[col] for col in columns]

    query = f"INSERT INTO {TABLE_NAME} ({cols_joined}) VALUES ({placeholders})"

    new_po_id = None
    try:
        print(f"Executing DB query: {query} with values: {values}")
        cursor.execute(query, tuple(values))
        conn.commit()
        new_po_id = cursor.lastrowid  # Get the ID of the newly inserted row
        print(f"Successfully created PO with ID: {new_po_id}")
    except Exception as e:
        print(f"Error creating PO in database: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

    if new_po_id:
        # Fetch and return the created PO
        return fetch_po_by_id_from_db(new_po_id)
    return None


def update_po_fields_in_db(po_id: int, update_data: PurchaseOrderUpdateSchema) -> Optional[Dict[str, Any]]:
    """
    Updates specific fields (Checklist, Keterangan) of a purchase order in the database.
    """
    conn = get_mysql_connection()
    if not conn:
        return None

    cursor = conn.cursor(dictionary=True)

    # Get fields to update from the Pydantic model, excluding unset values
    update_values = update_data.dict(exclude_unset=True)

    if not update_values:
        print(f"No fields to update for PO ID {po_id}.")
        # Optionally, fetch and return the PO as is, or return None/error
        return fetch_po_by_id_from_db(po_id)

    set_clauses = []
    query_params = []

    for key, value in update_values.items():
        set_clauses.append(f"`{key}` = %s")
        query_params.append(value)

    query_params.append(po_id)  # For the WHERE clause

    query = f"UPDATE {TABLE_NAME} SET {', '.join(set_clauses)} WHERE id = %s"

    try:
        print(f"Executing DB query: {query} with params: {query_params}")
        cursor.execute(query, tuple(query_params))
        conn.commit()

        if cursor.rowcount == 0:
            print(
                f"No PO found with ID {po_id} to update, or no changes made.")
            # It's important to distinguish "not found" from "no effective change"
            # For now, if rowcount is 0, we assume it might not exist or data was same.
            # A pre-check if PO exists might be better.
            # Let's try fetching to confirm.
            updated_po = fetch_po_by_id_from_db(po_id)
            if not updated_po:
                return None  # Not found
            return updated_po  # Found, but maybe no change if data was same

        print(f"Successfully updated fields for PO ID: {po_id}")
    except Exception as e:
        print(f"Error updating PO ID {po_id} in database: {e}")
        conn.rollback()
        return None
    finally:
        cursor.close()
        conn.close()

    return fetch_po_by_id_from_db(po_id)  # Fetch and return the updated PO
