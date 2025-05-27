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
    if conn_mysql is None or df is None or df.empty:
        print("Cannot create table: No MySQL connection or no data.")
        return False

    cursor = conn_mysql.cursor()

    # Drop table if exists - for development, might want a more robust migration strategy for prod
    # For now, simple drop and create
    try:
        print(f"Dropping table '{table_name}' if it exists...")
        cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
        print(f"Table '{table_name}' dropped or did not exist.")
    except mysql.connector.Error as err:
        print(f"Error dropping table {table_name}: {err}")
        # If drop fails for critical reasons, might not want to proceed
        # return False

    # Construct CREATE TABLE statement from DataFrame dtypes
    # Add an auto-incrementing primary key 'id'
    cols_sql = ["`id` INT AUTO_INCREMENT PRIMARY KEY"]
    for col_name, dtype in df.dtypes.items():
        sql_type = "TEXT"  # Default type
        if "int64" in str(dtype):
            sql_type = "BIGINT"
        elif "float64" in str(dtype):
            sql_type = "DOUBLE"
        elif "datetime" in str(dtype):
            sql_type = "DATETIME"
        elif "bool" in str(dtype):
            sql_type = "BOOLEAN"

        # Sanitize column name for SQL
        safe_col_name = "".join(c if c.isalnum() else "_" for c in col_name)
        if safe_col_name != col_name:
            print(
                f"Warning: Column name '{col_name}' sanitized to '{safe_col_name}' for SQL.")

        cols_sql.append(f"`{safe_col_name}` {sql_type}")

    create_table_query = f"CREATE TABLE {table_name} ({', '.join(cols_sql)})"

    print(f"Creating table '{table_name}' with query: {create_table_query}")
    try:
        cursor.execute(create_table_query)
        conn_mysql.commit()
        print(f"Table '{table_name}' created successfully.")
        return True
    except mysql.connector.Error as err:
        print(f"Error creating table {table_name}: {err}")
        return False
    finally:
        cursor.close()


def load_data_to_mysql(conn_mysql, table_name, df, batch_size=500):
    """Loads data from DataFrame to MySQL table in batches."""
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

    cols = ", ".join([f"`{col}`" for col in df_cleaned.columns])
    placeholders = ", ".join(["%s"] * len(df_cleaned.columns))
    insert_query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"

    print(f"Loading data into MySQL table '{table_name}' in batches of {batch_size}...")
    
    data_tuples = [tuple(row) for row in df_cleaned.to_numpy()]
    
    total_rows = len(data_tuples)
    loaded_rows = 0

    try:
        for i in range(0, total_rows, batch_size):
            batch_data = data_tuples[i:i + batch_size]
            if not batch_data:
                continue
            
            cursor.executemany(insert_query, batch_data)
            loaded_rows += len(batch_data)

        conn_mysql.commit()
        print(f"Successfully loaded {loaded_rows} of {total_rows} rows into {table_name}.")
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


def trigger_ml_training():
    """Triggers the ML model training API endpoint."""
    ml_training_url = "http://127.0.0.1:8000/process/train-ml-model"
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

    # Load data
    load_success = load_data_to_mysql(
        conn_mysql, mysql_table_name, transformed_df)

    if load_success:
        print("ETL process completed successfully.")
        print("Attempting to trigger ML model training...")
        trigger_ml_training()
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
