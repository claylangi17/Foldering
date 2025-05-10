# Import centralized MySQL connection
from api.db.database import get_mysql_connection
import os
import pandas as pd
import pyodbc
from dotenv import load_dotenv
from datetime import datetime
import sys  # Added for sys.path modification

# Load environment variables from .env file
load_dotenv()

# Add project root to sys.path to allow sibling imports (api.db.database)
current_dir_etl = os.path.dirname(os.path.abspath(__file__))
# This should be the project_root
project_root_etl = os.path.dirname(current_dir_etl)
sys.path.append(project_root_etl)


# Get SQL Server connection details from environment variables
SQL_SERVER_DSN_NAME = os.getenv("SQL_SERVER_DSN_NAME")
SQL_SERVER_DRIVER = os.getenv("SQL_SERVER_DRIVER")
SQL_SERVER_HOST = os.getenv("SQL_SERVER_HOST")
SQL_SERVER_DATABASE = os.getenv("SQL_SERVER_DATABASE")
SQL_SERVER_USER = os.getenv("SQL_SERVER_USER")
SQL_SERVER_PASSWORD = os.getenv("SQL_SERVER_PASSWORD")
SQL_SERVER_TRUSTED_CONNECTION = os.getenv(
    "SQL_SERVER_TRUSTED_CONNECTION", "no")  # Default to no if not set

# MySQL details are now handled by api.db.database


def get_sql_server_connection():
    """Establishes a connection to the SQL Server database, prioritizing DSN if provided."""
    conn_parts = []
    if SQL_SERVER_DSN_NAME:
        conn_parts.append(f"DSN={SQL_SERVER_DSN_NAME}")
        # UID and PWD can be part of DSN or specified additionally
        if SQL_SERVER_USER:
            conn_parts.append(f"UID={SQL_SERVER_USER}")
        if SQL_SERVER_PASSWORD:
            conn_parts.append(f"PWD={SQL_SERVER_PASSWORD}")
    else:
        if not SQL_SERVER_DRIVER or not SQL_SERVER_HOST or not SQL_SERVER_DATABASE:
            print("Error: SQL Server DSN not provided, and DRIVER, HOST, or DATABASE is missing for manual connection string.")
            return None
        conn_parts.append(f"DRIVER={SQL_SERVER_DRIVER}")
        conn_parts.append(f"SERVER={SQL_SERVER_HOST}")
        conn_parts.append(f"DATABASE={SQL_SERVER_DATABASE}")
        if SQL_SERVER_USER:  # Only add UID/PWD if not relying solely on Trusted_Connection with DSN-less
            conn_parts.append(f"UID={SQL_SERVER_USER}")
        if SQL_SERVER_PASSWORD:
            conn_parts.append(f"PWD={SQL_SERVER_PASSWORD}")

    if SQL_SERVER_TRUSTED_CONNECTION.lower() == "yes":
        conn_parts.append("Trusted_Connection=yes")

    # Always add TrustServerCertificate for flexibility in dev environments
    conn_parts.append("TrustServerCertificate=yes")

    conn_str = ";".join(conn_parts)

    # Be careful logging PWD in real prod
    print(f"Attempting SQL Server connection with: {conn_str}")
    try:
        conn = pyodbc.connect(conn_str)
        print("Successfully connected to SQL Server.")
        return conn
    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        print(f"Error connecting to SQL Server: {sqlstate}")
        # Consider more specific error handling here
        if '08001' in sqlstate:  # Client unable to establish connection
            print("Network-related error or server not reachable.")
        elif '28000' in sqlstate:  # Invalid authorization specification
            print("Invalid credentials.")
        # Syntax error or access violation (often db not found)
        elif '42000' in sqlstate:
            print(
                f"Database '{SQL_SERVER_DATABASE}' not found or access denied.")
        else:
            print(f"Unhandled pyodbc error: {ex}")
        return None

# Removed get_mysql_connection() from here, as it's now imported.


def fetch_data_from_sql_server(conn_sql, company_id, from_month, from_year, to_month, to_year, from_item_code, to_item_code):
    """Fetches data from SQL Server using the PO_ListProd stored procedure."""
    if conn_sql is None:
        return None

    query = f"""
        EXEC PO_ListProd 
            @CompanyID='{{company_id}}', 
            @FromMonth='{{from_month}}', 
            @FromYear='{{from_year}}', 
            @ToMonth='{{to_month}}', 
            @ToYear='{{to_year}}', 
            @FromItemCode='{{from_item_code}}', 
            @ToItemCode='{{to_item_code}}'
    """
    # It's generally safer to pass parameters to pyodbc's execute method
    # rather than f-string formatting directly into SQL,
    # but for stored procedures, this direct call is common.
    # Ensure parameters are validated/sanitized if they come from untrusted sources.

    # For pyodbc, parameters for stored procedures are typically passed as a tuple to execute
    # Example: cursor.execute("{CALL PO_ListProd(?,?,?,?,?,?,?)}", company_id, from_month, ...)
    # However, the user provided EXEC syntax, so I'll try to match that pattern,
    # but it's worth noting the more standard parameterized query approach.
    # Using parameterized queries for stored procedures is safer and often more performant.

    # Parameters for the stored procedure
    params = (
        company_id,
        # Ensure these are passed as appropriate types (e.g., int or str)
        from_month,
        # based on what the SP expects. VBA code passes them as strings.
        from_year,
        to_month,
        to_year,
        from_item_code,
        to_item_code
    )

    # The SQL command to execute the stored procedure with placeholders
    # Note: pyodbc uses '?' as placeholders.
    sql_command = "{CALL PO_ListProd (?, ?, ?, ?, ?, ?, ?)}"

    print(
        f"Executing SQL Server Stored Procedure: PO_ListProd with parameters: {params}")

    try:
        # It's generally better to use a cursor for executing SPs that might not return results
        # or to handle output parameters, etc.
        # However, if PO_ListProd is guaranteed to return a single result set, read_sql_query can work.
        # For robustness, let's use a cursor.
        cursor = conn_sql.cursor()
        cursor.execute(sql_command, params)

        # Check if the cursor has results (some SPs might not return rows)
        if cursor.description is None:
            print("Stored procedure executed but did not return a result set.")
            df = pd.DataFrame()  # Return empty DataFrame
        else:
            rows = cursor.fetchall()
            # Get column names from cursor.description
            columns = [column[0] for column in cursor.description]
            df = pd.DataFrame.from_records(rows, columns=columns)

        # df = pd.read_sql_query(sql_command, conn_sql, params=params) # Alternative if SP always returns result set
        print(f"Successfully fetched {len(df)} rows from SQL Server.")
        return df
    except pd.io.sql.DatabaseError as e:
        print(f"Pandas SQL DatabaseError: {e}")
        # This can happen if the stored procedure doesn't return a result set
        # or if there's an issue with the query execution recognized by pandas
        if "No results.  Previous SQL was not a query." in str(e) or "The EXECUTE statement did not produce a result set." in str(e):
            print(
                "The stored procedure did not return a result set that pandas could read directly.")
            print("This might be normal if the SP performs actions without a SELECT, or an error occurred within the SP.")
        return None
    except pyodbc.Error as e:
        print(f"Error executing stored procedure: {e}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred during data fetching: {e}")
        return None


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
    # For now, I'll assume they are 'QTY_ORDER' and 'IDR_PRICE'.
    # And 'TGL_PO' for date sorting.

    qty_col = 'QTY_ORDER'  # Replace with actual QTY column name from SP if different
    price_col = 'IDR_PRICE'  # Replace with actual Price column name from SP if different
    date_col = 'TGL_PO'  # Replace with actual PO Date column name from SP if different

    if qty_col not in df.columns or price_col not in df.columns:
        print(
            f"Error: Required columns '{qty_col}' or '{price_col}' not found in DataFrame for 'Sum of Order Amount IDR'.")
        # Decide how to handle: return df, or add empty columns, or raise error
    else:
        df[qty_col] = pd.to_numeric(df[qty_col], errors='coerce')
        df[price_col] = pd.to_numeric(df[price_col], errors='coerce')
        df['Sum_of_Order_Amount_IDR'] = df[qty_col] * df[price_col]

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


def load_data_to_mysql(conn_mysql, table_name, df):
    """Loads data from DataFrame to MySQL table."""
    if conn_mysql is None or df is None or df.empty:
        print("No data to load or no MySQL connection.")
        return False

    cursor = conn_mysql.cursor()

    # Ensure DataFrame column names match the sanitized names used for table creation
    # Or, better, use a library like SQLAlchemy which handles this more gracefully.
    # For now, assume df.columns are already safe or map them.
    # For simplicity, this example assumes direct mapping.

    # Renaming columns in DataFrame to match sanitized names if they were changed
    sanitized_columns = {}
    for col_name in df.columns:
        safe_col_name = "".join(c if c.isalnum() else "_" for c in col_name)
        if safe_col_name != col_name:
            sanitized_columns[col_name] = safe_col_name

    if sanitized_columns:
        df_renamed = df.rename(columns=sanitized_columns)
        print(
            f"DataFrame columns renamed for SQL compatibility: {sanitized_columns}")
    else:
        df_renamed = df

    cols = ", ".join([f"`{col}`" for col in df_renamed.columns])
    placeholders = ", ".join(["%s"] * len(df_renamed.columns))
    insert_query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders})"

    print(f"Loading data into MySQL table '{table_name}'...")
    try:
        data_tuples = [tuple(row) for row in df_renamed.to_numpy()]
        cursor.executemany(insert_query, data_tuples)
        conn_mysql.commit()
        print(
            f"Successfully loaded {len(data_tuples)} rows into {table_name}.")
        return True
    except mysql.connector.Error as err:
        print(f"Error loading data into {table_name}: {err}")
        conn_mysql.rollback()  # Rollback on error
        return False
    except mysql.connector.Error as err_mysql_specific:  # Catch specific mysql connector errors
        print(
            f"MySQL Connector Error during data loading into {table_name}: {err_mysql_specific}")
        conn_mysql.rollback()
        return False
    except Exception as e:  # Catch any other exceptions
        print(
            f"An unexpected error occurred during data loading into {table_name}: {e}")
        conn_mysql.rollback()
        return False
    finally:
        cursor.close()


def main_etl_process(company_id, from_month, from_year, to_month, to_year, from_item_code, to_item_code):
    """Main ETL process."""
    print("Starting ETL process...")

    conn_sql = get_sql_server_connection()
    conn_mysql = get_mysql_connection()

    if not conn_sql or not conn_mysql:
        print("ETL process aborted due to connection failure.")
        if conn_sql:
            conn_sql.close()
        if conn_mysql:
            conn_mysql.close()
        return

    raw_df = fetch_data_from_sql_server(
        conn_sql, company_id, from_month, from_year,
        to_month, to_year, from_item_code, to_item_code
    )

    if raw_df is None or raw_df.empty:
        print("No data fetched from SQL Server. ETL process cannot continue.")
        conn_sql.close()
        conn_mysql.close()
        return

    # Before transforming, it's crucial to know the actual column names from PO_ListProd
    # The user needs to provide these. For now, the transform_data function has placeholders.
    print("\n--- Column Names from SQL Server ---")
    print(raw_df.columns.tolist())
    print("-------------------------------------\n")
    print("IMPORTANT: Please verify the column names above and ensure they match the expectations in 'transform_data' function (qty_col, price_col, date_col).")

    # Use .copy() to avoid SettingWithCopyWarning
    transformed_df = transform_data(raw_df.copy())

    if transformed_df is None or transformed_df.empty:
        print("Data transformation failed or resulted in empty DataFrame. ETL process cannot continue.")
        conn_sql.close()
        conn_mysql.close()
        return

    mysql_table_name = "purchase_orders"

    # Create table (idempotent, drops if exists)
    table_created = create_table_in_mysql(
        conn_mysql, mysql_table_name, transformed_df)

    if not table_created:
        print(
            f"Failed to create table '{mysql_table_name}'. ETL process aborted.")
        conn_sql.close()
        conn_mysql.close()
        return

    # Load data
    load_success = load_data_to_mysql(
        conn_mysql, mysql_table_name, transformed_df)

    if load_success:
        print("ETL process completed successfully.")
    else:
        print("ETL process completed with errors during data loading.")

    # Close connections
    conn_sql.close()
    conn_mysql.close()
    print("Database connections closed.")


if __name__ == "__main__":
    # Example usage:
    # These parameters would typically come from an API call or configuration
    print("Running ETL script directly for testing...")

    # Dummy parameters for testing - replace with actuals or get from config/args
    test_company_id = "DummyCompany"
    test_from_month = "1"
    test_from_year = "2023"
    test_to_month = "12"
    test_to_year = "2023"
    test_from_item_code = "ITEM001"
    test_to_item_code = "ITEM999"

    # Before running, ensure .env file is populated with correct DB credentials
    # and that the PO_ListProd stored procedure exists and is accessible.

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
