import mysql.connector
import os
from dotenv import load_dotenv

# Load environment variables from .env file
# This ensures that if this module is imported, .env is loaded.
# However, it's often better to load_dotenv() once at the application entry point.
# For simplicity here, we'll include it.
load_dotenv(override=True)  # Added override=True

MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE")
MYSQL_PORT = os.getenv("MYSQL_PORT")


def get_mysql_connection():
    """Establishes and returns a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            port=MYSQL_PORT
        )
        # print("Successfully connected to MySQL from database.py.") # Optional: for debugging
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to MySQL from database.py: {err}")
        if err.errno == 1045:
            print("MySQL Access denied. Check user/password in .env.")
        elif err.errno == 1049:
            print(
                f"MySQL Database '{MYSQL_DATABASE}' not found. Check .env or create database.")
        elif err.errno == 2003:
            print(
                f"Can't connect to MySQL server on '{MYSQL_HOST}:{MYSQL_PORT}'. Check server status and host/port in .env.")
        else:
            print(f"Unhandled MySQL error from database.py: {err}")
        # In a real application, you might want to raise the exception
        # or handle it more gracefully depending on the context.
        return None

# Example of how to use:
# if __name__ == "__main__":
#     connection = get_mysql_connection()
#     if connection:
#         print("Test connection successful.")
#         connection.close()
#         print("Test connection closed.")
#     else:
#         print("Test connection failed.")
