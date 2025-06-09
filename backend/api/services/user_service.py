# backend/api/services/user_service.py
from typing import Optional
from ..db.database import get_mysql_connection
from ..schemas.user_schemas import User # To return the updated user
import datetime

USERS_TABLE_NAME = "users" # Consistent with auth_service

def update_user_company(user_id: int, new_company_code: int) -> Optional[User]:
    conn = get_mysql_connection()
    if not conn:
        print("UserService: DB connection failed.")
        return None

    cursor = conn.cursor(dictionary=True)
    
    # TODO: In a real application, verify the company code exists in a 'companies' table.
    # For example:
    # cursor.execute(f"SELECT 1 FROM companies WHERE company_code = %s", (new_company_code,))
    # if not cursor.fetchone():
    #     print(f"UserService: Company code {new_company_code} does not exist.")
    #     if cursor: cursor.close()
    #     if conn and conn.is_connected(): conn.close()
    #     return None # Or raise an appropriate HTTP exception if called from router context

    update_query = f"""
        UPDATE {USERS_TABLE_NAME}
        SET company_code = %s, updated_at = %s
        WHERE id = %s
    """
    current_time = datetime.datetime.utcnow() # Use UTC for consistency

    try:
        cursor.execute(update_query, (new_company_code, current_time, user_id))
        conn.commit()

        if cursor.rowcount == 0:
            print(f"UserService: No user found with ID {user_id} to update or company_code was already set to this value.")
            # Still attempt to fetch the user as they exist, maybe company code was already correct
            # Fall through to fetch and return current state if user exists
            pass # Allow falling through to fetch the user

        # Fetch the updated (or current) user data to return
        # Ensure all fields expected by User schema are selected, excluding hashed_password
        select_query = f"SELECT id, username, email, full_name, role, disabled, company_code, created_at, updated_at FROM {USERS_TABLE_NAME} WHERE id = %s"
        cursor.execute(select_query, (user_id,))
        user_data = cursor.fetchone()
        
        if user_data:
            return User(**user_data)
        else:
            # This case should ideally not be reached if rowcount > 0 or if user_id is valid
            print(f"UserService: User with ID {user_id} not found after update attempt.")
            return None
            
    except Exception as e:
        print(f"UserService: Error updating company for user ID '{user_id}': {e}")
        conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()
