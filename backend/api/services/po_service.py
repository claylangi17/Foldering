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
    search_field: Optional[str] = None,
    search_value: Optional[str] = None,
    company_code: Optional[int] = None,
    layer_filter: Optional[str] = None, # Implement layer filtering
    # month_filter: Optional[int] = None # TODO: Implement month filtering
) -> Dict[str, Any]:  # Returning dict with items and total count
    """
    Fetches purchase orders from the MySQL database with pagination and search.
    """
    conn = get_mysql_connection()
    if not conn:
        return {"items": [], "total": 0} # Return structure consistent with error

    cursor = conn.cursor(dictionary=True)
    
    where_conditions = []
    query_params_where = []

    # Always apply company_code filter if provided
    if company_code is not None:
        where_conditions.append("company_code = %s")
        query_params_where.append(company_code)

    # Apply search filters if search_value is provided
    if search_value:
        search_term_like = f"%{search_value}%"
        
        # Define allowed columns for specific search to prevent SQL injection via column names
        # These should match actual DB column names.
        allowed_text_search_columns = ['PO_No', 'ITEM_DESC', 'Supplier_Name', 'PR_No', 'PO_Status', 'Keterangan']
        allowed_numeric_search_columns = ['Total_Cumulative_QTY_Order', 'Sum_of_Order_Amount_IDR', 'Original_PRICE']
        checklist_column = 'Checklist'

        if search_field and search_field != 'ALL':
            if search_field in allowed_text_search_columns:
                where_conditions.append(f"`{search_field}` LIKE %s")
                query_params_where.append(search_term_like)
            elif search_field in allowed_numeric_search_columns:
                # For numeric fields, casting to CHAR for LIKE search allows partial number matches
                where_conditions.append(f"CAST(`{search_field}` AS CHAR) LIKE %s")
                query_params_where.append(search_term_like)
            elif search_field == checklist_column:
                # Handle boolean/tinyint for Checklist
                # Convert common string representations of boolean to 0 or 1
                if search_value.lower() in ['true', '1', 'yes', 'checked', 'ya']:
                    checklist_val = 1
                    where_conditions.append(f"`{checklist_column}` = %s")
                    query_params_where.append(checklist_val)
                elif search_value.lower() in ['false', '0', 'no', 'unchecked', 'tidak']:
                    checklist_val = 0
                    where_conditions.append(f"`{checklist_column}` = %s")
                    query_params_where.append(checklist_val)
                else:
                    # If search_value for checklist is ambiguous, we might decide to match nothing
                    # or log a warning. For now, let's add a condition that likely won't match.
                    where_conditions.append("1=0") # No match for ambiguous checklist value
            else:
                # Field not allowed or not recognized for specific search, fall through to generic or ignore
                print(f"Warning: Specific search on unhandled field '{search_field}'. Falling back to generic if applicable or ignoring.")
                # To ensure it doesn't break, we can force a generic search or no search if specific field is invalid
                # For now, let's make it fall through to generic by clearing search_field effectively
                search_field = 'ALL' # Force generic search if specific field is invalid

        # Generic search if search_field is 'ALL', None, or became 'ALL' due to invalid specific field
        if not search_field or search_field == 'ALL':
            generic_search_columns = ['PO_No', 'ITEM_DESC', 'Supplier_Name', 'PR_No', 'Keterangan'] # ITEM is not in searchableColumnsConfig
            generic_clauses = [f"`{col}` LIKE %s" for col in generic_search_columns]
            # Also include numeric fields in generic search by casting them
            # generic_clauses.extend([f"CAST(`{col}` AS CHAR) LIKE %s" for col in allowed_numeric_search_columns])
            # For simplicity, generic search will stick to main text fields for now.
            if generic_clauses:
                 where_conditions.append(f"({' OR '.join(generic_clauses)})")
                 for _ in generic_clauses:
                    query_params_where.append(search_term_like)


    if layer_filter:
        try:
            level_prefix, name_to_filter = layer_filter.split('_', 1)
            # Assuming column names in purchase_orders table are L1, L2, L3, etc.
            # corresponding to the layer level.
            # This is an assumption and might need adjustment based on actual DB schema.
            column_to_filter = level_prefix 
            where_conditions.append(f"`{column_to_filter}` = %s")
            query_params_where.append(name_to_filter)
        except ValueError:
            # Handle cases where layer_filter might not be in the expected format
            print(f"Warning: Could not parse layer_filter: {layer_filter}. Expected format 'L#_Name'.")

    # TODO: Implement month_filter similarly by adding to where_conditions and query_params_where

    where_clause_str = ""
    if where_conditions:
        where_clause_str = " WHERE " + " AND ".join(where_conditions)

    total_count = 0
    pos = []

    try:
        # First, get the total count of records matching the criteria
        count_query = f"SELECT COUNT(*) as total_count FROM {TABLE_NAME}{where_clause_str}"
        print(f"Executing Count Query: {count_query} with params: {query_params_where}")
        cursor.execute(count_query, tuple(query_params_where))
        count_result = cursor.fetchone()
        if count_result:
            total_count = count_result['total_count']
        print(f"Total matching POs: {total_count}")

        # Then, fetch the paginated data if total_count > 0
        if total_count > 0:
            data_query = f"SELECT * FROM {TABLE_NAME}{where_clause_str} ORDER BY TGL_PO DESC, PO_No DESC LIMIT %s OFFSET %s"
            query_params_data = query_params_where + [limit, skip]
            print(f"Executing Data Query: {data_query} with params: {query_params_data}")
            cursor.execute(data_query, tuple(query_params_data))
            pos = cursor.fetchall()
            print(f"Fetched {len(pos)} POs for the current page.")
            # DEBUG: Print raw data fetched from DB for the first few items
            if pos:
                print("Raw DB data (first item if available):", pos[0]) 
                if len(pos) > 1:
                    print("Raw DB data (second item if available):", pos[1])
        else:
            print("No matching POs found, skipping data fetch for current page.")
            pos = [] # Ensure pos is an empty list if no records

    except Exception as e:
        print(f"Error fetching POs from database: {e}")
        # In case of error, return empty items and 0 total to prevent frontend issues
        return {"items": [], "total": 0}
    finally:
        cursor.close()
        conn.close()

    return {"items": pos, "total": total_count}


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
