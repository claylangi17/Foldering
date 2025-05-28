from typing import Optional
from ..db.database import get_mysql_connection
from ..schemas.user_schemas import UserCreate, UserInDB, User
from ..core.security import get_password_hash, verify_password

USERS_TABLE_NAME = "users"


def get_user_by_username(username: str) -> Optional[UserInDB]:
    conn = get_mysql_connection()
    if not conn:
        print("AuthService: DB connection failed.")
        return None

    cursor = conn.cursor(dictionary=True)
    query = f"SELECT id, username, email, full_name, hashed_password, role, disabled FROM {USERS_TABLE_NAME} WHERE username = %s"
    try:
        cursor.execute(query, (username,))
        user_data = cursor.fetchone()
        if user_data:
            return UserInDB(**user_data)
        return None
    except Exception as e:
        print(
            f"AuthService: Error fetching user by username '{username}': {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def create_user(user_in: UserCreate) -> Optional[User]:
    # Check if user already exists
    existing_user = get_user_by_username(user_in.username)
    if existing_user:
        # In a real app, you might raise an HTTPException here if called from a router
        print(
            f"AuthService: Username '{user_in.username}' already registered.")
        return None

    hashed_password = get_password_hash(user_in.password)

    conn = get_mysql_connection()
    if not conn:
        print("AuthService: DB connection failed for creating user.")
        return None

    cursor = conn.cursor()
    # Default role is 'user' as defined in UserInDBBase schema,
    # but we can be explicit or allow role setting during creation if needed.
    # For now, using the schema default.
    query = f"""
        INSERT INTO {USERS_TABLE_NAME} (username, email, full_name, hashed_password, role, disabled)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    # Assuming default role 'user' and disabled 'False' for new users
    # Role can be enhanced later (e.g. admin creates SPV)
    default_role = "user"
    default_disabled_status = False

    try:
        cursor.execute(query, (
            user_in.username,
            user_in.email,
            user_in.full_name,
            hashed_password,
            default_role,  # Explicitly set default role
            default_disabled_status  # Explicitly set default disabled status
        ))
        conn.commit()
        user_id = cursor.lastrowid
        if user_id:
            # Return a User schema object (doesn't include hashed_password)
            return User(
                id=user_id,
                username=user_in.username,
                email=user_in.email,
                full_name=user_in.full_name,
                role=default_role,
                disabled=default_disabled_status
            )
        return None
    except Exception as e:
        print(f"AuthService: Error creating user '{user_in.username}': {e}")
        conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = get_user_by_username(username)
    if not user:
        return None
    if user.disabled:  # Check if user account is disabled
        print(
            f"AuthService: Authentication failed for disabled user '{username}'.")
        return None  # Or raise a specific exception/return a specific status
    if not verify_password(password, user.hashed_password):
        return None
    return user
