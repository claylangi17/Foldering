# Import centralized MySQL connection
from api.db.database import get_mysql_connection
import os
import pandas as pd
import requests  # Added for API calls
from dotenv import load_dotenv
from datetime import datetime
import sys  # Added for sys.path modification
import mysql.connector # For database error handling and operations

# Load environment variables from .env file
load_dotenv()

# Add project root to sys.path to allow sibling imports (api.db.database)
current_dir_etl = os.path.dirname(os.path.abspath(__file__))
# This should be the project_root
project_root_etl = os.path.dirname(current_dir_etl)
sys.path.append(project_root_etl)


# Removed get_mysql_connection() from here, as it's now imported.

API_BASE_URL = "http://management.sansico.com:8080/Clai/PurchaseOrder/"

def fetch_data_from_api(company_id, from_month, from_year, to_month, to_year, from_item_code, to_item_code):
    """Fetches data from the PHP API and returns a Pandas DataFrame."""
    params = {
        'CompanyID': company_id,
        'FromMonth': from_month,
        'FromYear': from_year,
        'ToMonth': to_month,
        'ToYear': to_year,
        'FromItemCode': from_item_code,
        'ToItemCode': to_item_code
    }
    print(f"Fetching data from API: {API_BASE_URL} with params: {params}")
    try:
        response = requests.get(API_BASE_URL, params=params, timeout=120) # Increased timeout to 120 seconds
        response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)
        
        json_response = response.json()
        data_list = json_response.get('data')

        if data_list is None:
            # This handles cases where 'data' key is missing or is null (e.g., empty response from PHP script)
            print("API response did not contain a 'data' field or it was null. Returning empty DataFrame.")
            return pd.DataFrame()
        if not isinstance(data_list, list):
            print(f"API response 'data' field is not a list. Type: {type(data_list)}. Returning empty DataFrame.")
            return pd.DataFrame()
        if not data_list: # Handles empty list case
            print("API returned an empty list in the 'data' field. Returning empty DataFrame.")
            return pd.DataFrame()

        df = pd.DataFrame(data_list)
        # Standardize column names if necessary, e.g. API uses 'PO_NO' vs 'PO_No'
        # The PHP script uses: PO_NO, TGL_PO, ITEM, ITEM_DESC, QTY_ORDER, UNIT, Original_PRICE, 
        # Currency, Order_Amount_IDR, Supplier_Name, PR_No, PR_Date, PR_Ref_A, PR_Ref_B, 
        # Term_Payment_at_PO, RECEIVED_DATE, PO_Status
        # These seem consistent enough for now.
        print(f"Successfully fetched {len(df)} rows from API.")
        return df
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - Status Code: {response.status_code}")
        print(f"Response content: {response.text}")
        return pd.DataFrame() # Return empty DataFrame on HTTP error
    except requests.exceptions.ConnectionError as conn_err:
        print(f"Connection error occurred: {conn_err}")
        return pd.DataFrame()
    except requests.exceptions.Timeout as timeout_err:
        print(f"Timeout error occurred: {timeout_err}")
        return pd.DataFrame()
    except requests.exceptions.RequestException as req_err:
        print(f"An error occurred during API request: {req_err}")
        return pd.DataFrame()
    except ValueError as json_err: # Includes JSONDecodeError
        print(f"Error decoding JSON from API response: {json_err}")
        print(f"Response content: {response.text if 'response' in locals() else 'Response object not available'}")
        return pd.DataFrame()



def transform_data(df):
    """Transforms the DataFrame by adding new calculated and default columns."""
    if df is None or df.empty:
        print("No data to transform.")
        return df

    print("Transforming data...")

    # Ensure 'QTY_ORDER' and 'IDR_PRICE' are numeric, coercing errors to NaN
    # The column names from SP might be different, adjust if necessary.
    # Assuming 'QTY_ORDER' and 'IDR_PRICE' are the correct names from PO_ListProd.
    # If not, these will need to be mapped from the actual SP output column names.

    # Placeholder: User needs to confirm actual column names from PO_ListProd output
    # API provides: 'QTY_ORDER', 'Original_PRICE', 'Order_Amount_IDR', 'TGL_PO'.

    qty_col = 'QTY_ORDER'
    # 'Original_PRICE' from API is the unit price.
    price_col = 'Original_PRICE' 
    date_col = 'TGL_PO' # This is consistent with API output 'TGL_PO'.
    api_total_amount_col = 'Order_Amount_IDR' # API's pre-calculated total amount in IDR

    # Ensure QTY_ORDER is numeric
    if qty_col in df.columns:
        df[qty_col] = pd.to_numeric(df[qty_col], errors='coerce')
    else:
        print(f"Warning: Column '{qty_col}' not found in DataFrame.")

    # Ensure Original_PRICE is numeric (if it exists and is needed for other calculations)
    if price_col in df.columns:
        df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
    # else: # Not critical if we use Order_Amount_IDR primarily
        # print(f"Warning: Column '{price_col}' (unit price) not found in DataFrame.")

    # Use 'Order_Amount_IDR' from API if available, otherwise calculate it.
    # The target column name in the script is 'Sum_of_Order_Amount_IDR'.
    if api_total_amount_col in df.columns:
        df['Sum_of_Order_Amount_IDR'] = pd.to_numeric(df[api_total_amount_col], errors='coerce')
        print(f"Using '{api_total_amount_col}' from API for 'Sum_of_Order_Amount_IDR'.")
    elif qty_col in df.columns and price_col in df.columns:
        # Fallback to calculation if Order_Amount_IDR is not present
        print(f"'{api_total_amount_col}' not found. Calculating 'Sum_of_Order_Amount_IDR' from '{qty_col}' and '{price_col}'.")
        df['Sum_of_Order_Amount_IDR'] = df[qty_col] * df[price_col]
    else:
        print(
            f"Error: Cannot determine 'Sum_of_Order_Amount_IDR'. Missing '{api_total_amount_col}' or ('{qty_col}' and '{price_col}').")
        # Create an empty column or handle error appropriately
        df['Sum_of_Order_Amount_IDR'] = pd.NA


    if date_col not in df.columns:
        print(
            f"Error: Date column '{date_col}' not found for cumulative calculations.")
    else:
        # Convert TGL_PO to datetime objects for sorting, coercing errors
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.sort_values(by=date_col)  # Sort by date for cumulative sum

        if qty_col in df.columns:
            df['Total_Cumulative_QTY_Order'] = df[qty_col].cumsum()
        else:
            print(
                f"Warning: Column '{qty_col}' not available for 'Total_Cumulative_QTY_Order'.")

        if 'Sum_of_Order_Amount_IDR' in df.columns:
            df['Total_Cumulative_IDR_Amount'] = df['Sum_of_Order_Amount_IDR'].cumsum()
        else:
            print(
                f"Warning: Column 'Sum_of_Order_Amount_IDR' not available for 'Total_Cumulative_IDR_Amount'.")

    df['Checklist'] = False
    df['Keterangan'] = ''

    print("Data transformation complete.")
    return df


def create_table_in_mysql(conn_mysql, table_name, df):
    """Creates a table in MySQL based on the DataFrame structure if it doesn't exist."""
    if conn_mysql is None:
        print("No MySQL connection.")
        return False

    if df is None or df.empty:
        print("DataFrame is empty, cannot determine table structure.")
        return False

    # Map pandas dtypes to MySQL column types
    type_map = {
        'int64': 'INT',
        'float64': 'DOUBLE',
        'bool': 'BOOLEAN',
        'datetime64[ns]': 'DATETIME',
        'object': 'TEXT',
        'category': 'VARCHAR(255)',
    }

    cursor = conn_mysql.cursor()

    # Sanitize column names for SQL
    sanitized_columns = [
        "".join(c if c.isalnum() else "_" for c in col_name)
        for col_name in df.columns
    ]

    # Create column definitions for SQL
    column_definitions = []
    for i, col in enumerate(df.columns):
        sanitized_col = sanitized_columns[i]
        dtype_str = str(df[col].dtype)
        
        # If numeric column contains strings that can't be converted, pandas will report object
        # But we should handle it more carefully based on likely real type
        mysql_type = type_map.get(dtype_str, 'TEXT')
        
        # Special case for certain standard column names where we know the type should be more specific
        if sanitized_col.lower() in ('id', 'po_no', 'pr_no'):
            mysql_type = 'VARCHAR(50)'
        elif sanitized_col.lower() in ('item', 'item_code'):
            mysql_type = 'VARCHAR(100)'
        elif sanitized_col.lower() in ('item_desc', 'item_description'):
            mysql_type = 'TEXT'
        elif sanitized_col.lower() in ('qty', 'qty_order'):
            mysql_type = 'DOUBLE'
        elif sanitized_col.lower() in ('unit', 'currency'):
            mysql_type = 'VARCHAR(20)'
        elif sanitized_col.lower() in ('price', 'original_price'):
            mysql_type = 'DOUBLE'
        elif sanitized_col.lower().endswith('_date') or sanitized_col.lower() == 'tgl_po':
            mysql_type = 'DATE'
        elif sanitized_col.lower() in ('po_status'):
            mysql_type = 'VARCHAR(50)'
        elif sanitized_col.lower() in ('supplier_name'):
            mysql_type = 'VARCHAR(255)'
        elif sanitized_col.lower() in ('company_code'):
            mysql_type = 'INT(11)'
        
        column_definitions.append(f"`{sanitized_col}` {mysql_type}")

    # Add ID column as auto-increment primary key if it doesn't exist
    if 'id' not in map(str.lower, df.columns):
        column_definitions.insert(0, "`id` INT AUTO_INCREMENT PRIMARY KEY")
        
    # Ensure company_code column exists
    if 'company_code' not in map(str.lower, df.columns) and not any(col.lower() == 'company_code' for col in sanitized_columns):
        column_definitions.append("`company_code` INT(11)")

    # Create the table creation SQL
    columns_sql = ", \n".join(column_definitions)
    create_table_sql = f"""CREATE TABLE IF NOT EXISTS {table_name} (
    {columns_sql}
    ) ENGINE=InnoDB;"""

    try:
        print(f"Creating table {table_name} if it doesn't exist...")
        cursor.execute(create_table_sql)
        
        # Add indexes for performance optimization
        try:
            print(f"Adding indexes for better performance...")
            # Add index on PO_NO and company_code for faster lookups
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_po_company ON {table_name} (PO_NO, company_code)")
            # Add index on company_code for company filtering
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_company ON {table_name} (company_code)")
            # Add index on PO_Status for status filtering
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_status ON {table_name} (PO_Status)")
        except mysql.connector.Error as idx_err:
            print(f"Warning: Could not create indexes: {idx_err}")
        
        # Check if table has been created
        cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
        if cursor.fetchone():
            print(f"Table '{table_name}' exists.")
            return True
        else:
            print(f"Failed to find table '{table_name}' after creation attempt.")
            return False
    except mysql.connector.Error as err:
        print(f"MySQL Connector Error during table creation: {err}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred during table creation: {e}")
        return False
    finally:
        cursor.close()


def load_data_to_mysql(conn_mysql, table_name, df, company_code, batch_size=500):
    """Loads data from DataFrame to MySQL table in batches with company filtering and incremental updates.
    
    Args:
        conn_mysql: MySQL connection
        table_name: Name of the target table
        df: DataFrame with data to load
        company_code: Company code to associate with this data
        batch_size: Size of batches for loading data
    """
    if conn_mysql is None or df is None or df.empty:
        print("No data to load or no MySQL connection.")
        return False

    cursor = conn_mysql.cursor()

    # Sanitize column names in DataFrame to match table schema
    # This ensures consistency with how columns were defined in `create_table_in_mysql`
    original_to_sanitized_map = {
        col_name: "".join(c if c.isalnum() else "_" for c in col_name)
        for col_name in df.columns
    }
    df_renamed = df.rename(columns=original_to_sanitized_map)
    
    actually_renamed_cols = {
        orig: new_name for orig, new_name in original_to_sanitized_map.items() if orig != new_name
    }
    if actually_renamed_cols:
        print(f"DataFrame columns renamed for SQL compatibility: {actually_renamed_cols}")
    
    # Replace pandas types like NaT, and numpy.nan with Python's None for SQL compatibility
    df_cleaned = df_renamed.where(pd.notnull(df_renamed), None)
    
    # Add company_code column if it doesn't exist
    if 'company_code' not in df_cleaned.columns:
        df_cleaned['company_code'] = company_code
        print(f"Added company_code column with value: {company_code}")

    # Process each row based on PO_NO and PO_Status
    total_rows = len(df_cleaned)
    inserted_rows = 0
    updated_rows = 0
    skipped_rows = 0
    duplicate_rows = 0
    
    print(f"Processing {total_rows} rows with company_code {company_code} for incremental loading...")
    
    try:
        # First, check which POs already exist in the database BEFORE any inserts
        # This gives us a true picture of what's already in the database
        existing_pos = set()
        try:
            existing_po_query = f"SELECT PO_NO FROM {table_name} WHERE company_code = %s"
            cursor.execute(existing_po_query, (company_code,))
            existing_pos = {row[0] for row in cursor.fetchall()}  # Make sure to consume all results
            print(f"Found {len(existing_pos)} existing PO records in database for company {company_code}")
        except Exception as e:
            print(f"Error checking existing POs: {e}")
            # Continue with empty set if there's an error
        
        # Also track POs processed in this batch to catch duplicates within the input data
        processed_pos_this_batch = set()
        
        # Group data into batches for efficient processing
        row_batches = [df_cleaned.iloc[i:i + batch_size] for i in range(0, len(df_cleaned), batch_size)]
        
        for batch_df in row_batches:
            for _, row in batch_df.iterrows():
                # Check if PO_NO exists for this company
                po_no = row.get('PO_NO', row.get('po_no'))
                po_status = row.get('PO_Status', row.get('po_status'))
                
                if not po_no:
                    print(f"Warning: Row missing PO_NO, skipping: {row}")
                    skipped_rows += 1
                    continue
                
                # Track duplicates for reporting, but still process the row
                if po_no in processed_pos_this_batch:
                    duplicate_rows += 1
                
                processed_pos_this_batch.add(po_no)
                
                # Check if this PO existed in the database before this ETL run
                if po_no in existing_pos:
                    try:
                        # Check current status to see if we should update
                        check_query = f"SELECT id, PO_Status FROM {table_name} WHERE PO_NO = %s AND company_code = %s"
                        cursor.execute(check_query, (po_no, company_code))
                        existing_record = cursor.fetchone()
                        
                        # Important: consume any remaining results
                        if cursor.with_rows:
                            cursor.fetchall()
                            
                        if existing_record:
                            existing_id, existing_status = existing_record
                            
                            # If existing PO is closed, don't update it
                            if existing_status and existing_status.lower() == 'closed':
                                skipped_rows += 1
                                continue
                            
                            # Otherwise, update the existing record
                            update_cols = [f"`{col}` = %s" for col in df_cleaned.columns if col.lower() != 'id']
                            update_vals = [row[col] for col in df_cleaned.columns if col.lower() != 'id']
                            
                            update_query = f"UPDATE {table_name} SET {', '.join(update_cols)} WHERE id = %s"
                            cursor.execute(update_query, update_vals + [existing_id])
                            updated_rows += 1
                    except Exception as e:
                        print(f"Error updating existing PO {po_no}: {e}")
                        # Fall back to inserting if the update fails
                        try:
                            # Insert new record as fallback
                            cols = ", ".join([f"`{col}`" for col in df_cleaned.columns])
                            placeholders = ", ".join(["%s"] * len(df_cleaned.columns))
                            insert_query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"
                            
                            cursor.execute(insert_query, tuple(row))
                            inserted_rows += 1
                            print(f"Inserted PO {po_no} after failed update attempt")
                        except Exception as insert_err:
                            print(f"Error inserting PO {po_no} after failed update: {insert_err}")
                            skipped_rows += 1
                else:
                    # Insert new record - it wasn't in the database before this ETL run
                    try:
                        cols = ", ".join([f"`{col}`" for col in df_cleaned.columns])
                        placeholders = ", ".join(["%s"] * len(df_cleaned.columns))
                        insert_query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"
                        
                        cursor.execute(insert_query, tuple(row))
                        inserted_rows += 1
                    except Exception as e:
                        print(f"Error inserting new PO {po_no}: {e}")
                        skipped_rows += 1
            
            # Commit after each batch
            conn_mysql.commit()

        print(f"Company {company_code} data loading results:")
        print(f"  - Inserted: {inserted_rows} new records")
        print(f"  - Updated: {updated_rows} existing records")
        print(f"  - Skipped: {skipped_rows} closed PO records")
        print(f"  - Duplicates in input data: {duplicate_rows} records")
        print(f"  - Total processed: {inserted_rows + updated_rows + skipped_rows + duplicate_rows} of {total_rows} rows")
        
        return True
    except mysql.connector.Error as err: # This will now work after the import is added
        print(f"MySQL Connector Error during data loading into {table_name}: {err}")
        try:
            conn_mysql.rollback()
            print("Transaction rolled back.")
        except Exception as rb_err:
            print(f"Error during rollback: {rb_err}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred during data loading into {table_name}: {e}")
        try:
            conn_mysql.rollback()
            print("Transaction rolled back due to unexpected error.")
        except Exception as rb_err:
            print(f"Error during rollback: {rb_err}")
        return False
    finally:
        cursor.close()


def trigger_ml_training(company_id=None):
    """Triggers the ML model training API endpoint."""
    ml_training_url = "http://127.0.0.1:8000/process/train-ml-model"
    
    # Add company_id as a query parameter if provided
    if company_id:
        ml_training_url += f"?company_code={company_id}"
        print(f"Triggering ML training for company_id: {company_id}")
    else:
        print("Warning: No company_id provided for ML training")
        
    try:
        response = requests.post(ml_training_url) # Using POST as it's a process trigger
        response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)
        print(f"Successfully triggered ML model training. Status: {response.status_code}")
        print(f"ML Training API Response: {response.json()}") # Assuming API returns JSON
    except requests.exceptions.RequestException as e:
        print(f"Error triggering ML model training: {e}")
    except Exception as e:
        print(f"An unexpected error occurred while triggering ML model training: {e}")

def main_etl_process(company_id, from_month, from_year, to_month, to_year, from_item_code, to_item_code):
    """Main ETL process."""
    print("Starting ETL process...")

    # Parameters for the ETL process
    # These can be dynamically set, e.g., from command-line arguments, a config file, or another system.
    COMPANY_ID = os.getenv('ETL_COMPANY_ID', company_id)
    FROM_MONTH = os.getenv('ETL_FROM_MONTH', from_month)
    FROM_YEAR = os.getenv('ETL_FROM_YEAR', from_year)
    TO_MONTH = os.getenv('ETL_TO_MONTH', to_month)
    TO_YEAR = os.getenv('ETL_TO_YEAR', to_year)
    FROM_ITEM_CODE = os.getenv('ETL_FROM_ITEM_CODE', from_item_code)
    TO_ITEM_CODE = os.getenv('ETL_TO_ITEM_CODE', to_item_code)

    print(f"Running ETL for Company: {COMPANY_ID}, Period: {FROM_MONTH}/{FROM_YEAR} to {TO_MONTH}/{TO_YEAR}, Items: {FROM_ITEM_CODE} to {TO_ITEM_CODE}")

    conn_mysql = get_mysql_connection()

    if not conn_mysql:
        print("ETL process aborted due to connection failure.")
        if conn_mysql:
            conn_mysql.close()
        return

    # 1. Extract data from API (New method)
    df_raw = fetch_data_from_api(company_id, from_month, from_year,
                                 to_month, to_year, from_item_code, to_item_code)

    if df_raw is None or df_raw.empty:
        print("No data extracted from API. Aborting ETL process.")
        return

    # Before transforming, it's crucial to know the actual column names from API
    # The user needs to provide these. For now, the transform_data function has placeholders.
    print("\n--- Column Names from API ---")
    print(df_raw.columns.tolist())
    print("-------------------------------------\n")
    print("IMPORTANT: Please verify the column names above and ensure they match the expectations in 'transform_data' function (qty_col, price_col, date_col).")

    # Use .copy() to avoid SettingWithCopyWarning
    transformed_df = transform_data(df_raw.copy())

    if transformed_df is None or transformed_df.empty:
        print("Data transformation failed or resulted in empty DataFrame. ETL process cannot continue.")
        if conn_mysql: conn_mysql.close()
        return

    mysql_table_name = "purchase_orders"

    # Create table (idempotent, drops if exists)
    table_created = create_table_in_mysql(
        conn_mysql, mysql_table_name, transformed_df)

    if not table_created:
        print(
            f"Failed to create table '{mysql_table_name}'. ETL process aborted.")
        if conn_mysql: conn_mysql.close()
        return

    # Load data with company code
    load_success = load_data_to_mysql(
        conn_mysql, mysql_table_name, transformed_df, company_id)

    if load_success:
        print("ETL process completed successfully.")
        print("Attempting to trigger ML model training...")
        trigger_ml_training(company_id)
    else:
        print("ETL process completed with errors during data loading. ML training will not be triggered.")

    # Close MySQL connection
    if conn_mysql: conn_mysql.close()
    print("MySQL database connection closed.")


if __name__ == "__main__":
    # Example usage:
    # These parameters would typically come from an API call or configuration
    print("Running ETL script directly for testing...")

    # Parameters for testing, using the API example values you provided as defaults.
    # These can be overridden by setting environment variables like ETL_COMPANY_ID, ETL_FROM_MONTH, etc.
    test_company_id = "180"
    test_from_month = "01"
    test_from_year = "2025"
    test_to_month = "01"
    test_to_year = "2025"
    test_from_item_code = "B"
    test_to_item_code = "ZZZZZZ"

    print(f"--- Running ETL Script with Test Parameters ---")
    print(f"Company ID: {test_company_id}")
    print(f"From: {test_from_month}/{test_from_year}, Item: {test_from_item_code}")
    print(f"To:   {test_to_month}/{test_to_year}, Item: {test_to_item_code}")
    print(f"Note: These parameters can be overridden by ETL_... environment variables.")
    print(f"Ensure your .env file has MySQL credentials (MYSQL_HOST, MYSQL_USER, etc.)")
    print(f"-----------------------------------------------")

    # Before running, ensure .env file is populated with correct MySQL DB credentials.
    # To run the ETL process for testing, uncomment the main_etl_process call below:
    # main_etl_process(
    #     test_company_id,
    #     test_from_month,
    #     test_from_year,
    #     test_to_month,
    #     test_to_year,
    #     test_from_item_code,
    #     test_to_item_code
    # )
    print("\nTo run the ETL process for testing, uncomment the main_etl_process call in __main__")
    print("and provide valid parameters and .env configuration.")
    print("Also, ensure the column names from your 'PO_ListProd' stored procedure")
    print("are correctly mapped in the 'transform_data' function (qty_col, price_col, date_col).")

    # Example: How to test connection functions individually
    # print("\nTesting SQL Server connection...")
    # test_conn_sql = get_sql_server_connection()
    # if test_conn_sql:
    #     test_conn_sql.close()
    #     print("SQL Server test connection closed.")

    # print("\nTesting MySQL connection...")
    # test_conn_mysql = get_mysql_connection()
    # if test_conn_mysql:
    #     test_conn_mysql.close()
    #     print("MySQL test connection closed.")
