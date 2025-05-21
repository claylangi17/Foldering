# Using the centralized DB connection
from api.db.database import get_mysql_connection
import pandas as pd
# from sentence_transformers import SentenceTransformer # No longer needed for folder structure
# from sklearn.cluster import KMeans # No longer needed
# import joblib  # For saving/loading sklearn models # No longer needed
import os
import sys
import re  # Added for regex parsing
from dotenv import load_dotenv

# Add project root to sys.path to allow sibling imports (api.db.database)
current_dir_ml = os.path.dirname(os.path.abspath(__file__))
# This should be the project_root
project_root_ml = os.path.dirname(current_dir_ml)
sys.path.append(project_root_ml)


# Load environment variables, override ensures it re-reads if already loaded elsewhere
load_dotenv(override=True)

# Configuration
# MODEL_NAME = os.getenv("MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2") # Not directly used for parsing
# MODEL_SAVE_PATH = os.path.join(current_dir_ml, "models") # No models to save for this approach
# if not os.path.exists(MODEL_SAVE_PATH):
#     os.makedirs(MODEL_SAVE_PATH)

# --- Database Interaction ---


def fetch_item_data_for_ml() -> pd.DataFrame:
    """
    Fetches item data (e.g., ID, ITEM_NAME, ITEM_DESC) from the purchase_orders table.
    We need a unique identifier for each distinct item if possible, or use PO id + item name.
    For now, let's assume we want to cluster based on ITEM_NAME from purchase_orders.
    We should probably select distinct item names to avoid redundant processing.
    """
    conn = get_mysql_connection()
    if not conn:
        print("ML Pipeline: Failed to connect to MySQL.")
        return pd.DataFrame()

    # Query to select distinct item names. User might have ITEM_ID or similar.
    # For now, using ITEM_NAME. Consider ITEM_DESC if it's more detailed.
    # Also fetching 'id' (PO id) for now, though ideally we'd have a distinct item_id.
    # Let's assume 'ITEM_NAME' is the primary field for embedding.
    # We need a unique key for items. If ITEM_NAME is not unique, this needs refinement.
    # We need to select columns that actually exist in the 'purchase_orders' table.
    # Based on SQL Server output, these are 'ITEM' and 'ITEM_DESC'.
    # 'id' is the auto-incremented primary key we added to 'purchase_orders'.

    query = "SELECT id, ITEM, ITEM_DESC FROM purchase_orders WHERE (ITEM IS NOT NULL AND TRIM(ITEM) != '') OR (ITEM_DESC IS NOT NULL AND TRIM(ITEM_DESC) != '')"
    print(f"ML Pipeline: Executing query: {query}")

    df = pd.DataFrame()
    try:
        # Using pandas read_sql_query should be fine here as the query is simple.
        # The UserWarning about SQLAlchemy is a general pandas warning for DBAPI2 connections.
        df = pd.read_sql_query(query, conn)
        print(f"ML Pipeline: Fetched {len(df)} item records for training.")
    except Exception as e:
        print(f"ML Pipeline: Error fetching item data: {e}")
        # If the error is "Unknown column 'ITEM_NAME' in 'field list'", it confirms the issue.
        # We are now querying for 'ITEM' and 'ITEM_DESC'.
        conn.close()  # Ensure connection is closed on error too
        return pd.DataFrame()  # Return empty df on error
    finally:
        if conn.is_connected():  # Check if connection is still open before closing
            conn.close()

    if df.empty:
        return df

    # Create 'description_for_embedding' using ITEM_DESC if available and not empty, otherwise use ITEM.
    # This logic assumes 'ITEM' will always exist if 'ITEM_DESC' is empty but the row was selected.
    def get_description(row):
        desc = row['ITEM_DESC']
        item = row['ITEM']
        if pd.notnull(desc) and str(desc).strip() != "":
            return str(desc)
        elif pd.notnull(item) and str(item).strip() != "":
            return str(item)
        return ""  # Should ideally not happen due to WHERE clause

    df['description_for_embedding'] = df.apply(get_description, axis=1)

    # Filter out rows where description_for_embedding ended up empty
    df = df[df['description_for_embedding'].str.strip() != '']

    # Drop duplicates based on the description used for embedding to avoid redundant computations
    # Keep the first 'id' associated with a unique description.
    # This means if multiple POs have the exact same description, only one embedding is generated.
    # The mapping back to all original POs will need to be handled later.
    distinct_items_df = df.drop_duplicates(
        subset=['description_for_embedding'])
    print(
        f"ML Pipeline: Found {len(distinct_items_df)} unique item descriptions for embedding.")

    # Contains 'id' (original PO id) and 'description_for_embedding'
    # For the new parsing logic, we want ALL rows from purchase_orders, not just distinct descriptions initially.
    # The `distinct_items_df` logic will be handled differently.
    # Let's modify this to return the full df for now.
    # The `drop_duplicates` part was for optimizing embedding generation.
    # We will create layer_definitions from unique parsed folder names.
    # We will create item_classifications for each original PO line.

    # df['description_for_embedding'] is already created.
    # Return df, not distinct_items_df
    print(
        f"ML Pipeline: Returning {len(df)} total item rows for processing (not yet distinct).")
    return df


# The following DB functions (save_item_clusters_to_db, get_layer_definition_id_from_db,
# create_and_populate_layer_definitions) will be significantly refactored or replaced
# by more direct logic within the new run_training_pipeline.
# For now, I will comment them out to avoid conflicts and redefine them as needed.

def save_parsed_item_classifications(classifications_to_save: list):
    """
    Saves parsed item classifications (L2 folder assignments) to the item_classifications table.
    Each entry in classifications_to_save is a dict:
    {'item_po_id': po_id, 'item_description': original_desc, 'cluster_label': l2_folder_name, 'layer_name': 'L2_Parsed_Folders'}
    """
    if not classifications_to_save:
        print("No parsed classifications to save.")
        return

    conn = get_mysql_connection()
    if not conn:
        print("ML Pipeline: Failed to connect to MySQL for saving parsed classifications.")
        return
    cursor = conn.cursor()
    table_name = "item_classifications"

    # Clear ALL old data from item_classifications to ensure a fresh start with parsed data
    try:
        delete_query = f"DELETE FROM {table_name}"  # Deletes all rows
        print(f"ML Pipeline: Deleting ALL old entries from '{table_name}'.")
        cursor.execute(delete_query)
        conn.commit()
        print(
            f"ML Pipeline: Deleted {cursor.rowcount} old entries from {table_name}.")
    except Exception as e:
        print(
            f"ML Pipeline: Error deleting old entries from {table_name}: {e}")
        # If this fails, we might have issues. For now, proceeding.
        # Consider raising an error or handling more robustly in production.

    insert_query = f"""
    INSERT INTO {table_name} (item_po_id, item_description, cluster_label, layer_name) 
    VALUES (%(item_po_id)s, %(item_description)s, %(cluster_label)s, %(layer_name)s)
    """
    try:
        batch_size = 500  # Define a suitable batch size
        total_rows = len(classifications_to_save)
        
        if total_rows == 0:
            print("ML Pipeline: No parsed L2 classifications to save.")
        else:
            print(
                f"ML Pipeline: Inserting {total_rows} parsed L2 classifications in batches of {batch_size}.")
            try:
                for i in range(0, total_rows, batch_size):
                    batch_data = classifications_to_save[i:i + batch_size]
                    cursor.executemany(insert_query, batch_data)
                    conn.commit()  # Commit after each successful batch
                    print(f"ML Pipeline: Saved batch {i // batch_size + 1}/{(total_rows + batch_size - 1) // batch_size} ({len(batch_data)} rows)")
                print("ML Pipeline: All parsed L2 classifications saved successfully.")
            except Exception as e:
                print(f"ML Pipeline: Error saving parsed L2 classifications batch: {e}")
                conn.rollback()  # Rollback if any batch fails
    finally:
        cursor.close()
        conn.close()


def get_layer_definition_pk(layer_name_db: str, cluster_label_id: str, cursor) -> int | None:
    """
    Fetches the primary key 'id' from layer_definitions for a given layer_name_db and cluster_label_id.
    This is crucial for linking parent-child layers.
    """
    query = "SELECT id FROM layer_definitions WHERE layer_name_db = %s AND cluster_label_id = %s"
    try:
        cursor.execute(query, (layer_name_db, cluster_label_id))
        result = cursor.fetchone()
        if result:
            return result[0]
        return None
    except Exception as e:
        print(
            f"ML Pipeline: Error fetching layer definition PK for {layer_name_db}/{cluster_label_id}: {e}")
        return None


def create_and_populate_parsed_layer_definitions(definitions_to_insert: list):
    """
    Populates the layer_definitions table with parsed folder names.
    Each entry in definitions_to_insert is a dict:
    {'layer_name_db': str, 'cluster_label_id': str, 'descriptive_name': str, 'parent_layer_pk': int | None}
    """
    if not definitions_to_insert:
        print("No parsed layer definitions to insert.")
        return

    conn = get_mysql_connection()
    if not conn:
        print(f"ML Pipeline: Failed to connect to MySQL for parsed layer definitions.")
        return
    cursor = conn.cursor()
    table_name = "layer_definitions"

    # Deletion is now handled once at the beginning of the main pipeline function.
    # try:
    #     delete_query = f"DELETE FROM {table_name}"
    #     print(
    #         f"ML Pipeline: Deleting ALL old definitions from '{table_name}'.")
    #     cursor.execute(delete_query)
    #     conn.commit()
    #     print(
    #         f"ML Pipeline: Deleted {cursor.rowcount} old definitions from {table_name}.")
    # except Exception as e:
    #     print(
    #         f"ML Pipeline: Error deleting old definitions from {table_name}: {e}")

    insert_query = f"""
    INSERT INTO {table_name} (layer_name_db, cluster_label_id, descriptive_name, parent_layer_id) 
    VALUES (%(layer_name_db)s, %(cluster_label_id)s, %(descriptive_name)s, %(parent_layer_pk)s)
    """
    try:
        print(
            # Print sample
            f"ML Pipeline: Inserting {len(definitions_to_insert)} parsed layer definitions. Sample data: {definitions_to_insert[:5]}")
        cursor.executemany(insert_query, definitions_to_insert)
        conn.commit()
        print("ML Pipeline: Parsed layer definitions populated successfully.")
    except Exception as e:
        print(f"ML Pipeline: Error populating parsed layer definitions: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()


# --- ML Steps --- (These are no longer ML steps in the KMeans sense)

# Added default for model_name
def generate_embeddings(texts: pd.Series, model_name: str = "paraphrase-multilingual-MiniLM-L12-v2") -> pd.DataFrame:
    pass  # No longer used for folder structure


def train_kmeans_model(embeddings_df: pd.DataFrame, n_clusters: int = 10, model_filename: str = "kmeans_model.joblib"):
    pass  # No longer used

# --- Parsing Logic ---


def parse_item_description_for_folders(description: str) -> tuple[str | None, str | None]:
    """
    Parses an item description to extract L1 and L2 folder names.
    Returns: (l1_folder_name, l2_folder_name)
    """
    description = description.strip()
    l1_name = None
    l2_name = None

    # Pattern 1: "MATERIAL GSM/ SIZE" (e.g., DUPLEX 450GSM/ 88X95CM)
    match_gsm_size = re.match(
        r"(.+?\s+\d+GSM)\s*/\s*(.*)", description, re.IGNORECASE)
    if match_gsm_size:
        l1_name = match_gsm_size.group(1).strip().upper()
        l2_name = description.upper()
        return l1_name, l2_name

    # Pattern 2: "MASTER CARTON [CODE]" (e.g., MASTER CARTON JDP63-09ELM)
    if description.upper().startswith("MASTER CARTON "):
        l1_name = "MASTER CARTON"
        l2_name = description.upper()
        return l1_name, l2_name

    # Pattern 3: "PLYWOOD [SIZE]" (e.g., PLYWOOD 1220X2440X18MM)
    if description.upper().startswith("PLYWOOD "):
        l1_name = "PLYWOOD"
        l2_name = description.upper()
        return l1_name, l2_name

    # New Pattern 4: "INK [details]"
    if description.upper().startswith("INK "):
        l1_name = "INK"
        l2_name = description.upper()
        return l1_name, l2_name

    # New Pattern 5: "TONER [details]"
    if description.upper().startswith("TONER "):
        l1_name = "TONER"
        l2_name = description.upper()
        return l1_name, l2_name

    # New Pattern 6: Dimensional products (e.g., "100X200X50CM", "50 X 70 MM")
    # Matches patterns like NUMxNUM, NUMxNUMxNUM, optionally with units like CM, MM
    match_dims = re.match(
        r"^\d+(\.\d+)?\s*[X\*]\s*\d+(\.\d+)?(\s*[X\*]\s*\d+(\.\d+)?)?\s*([A-Z]{2,})?$",
        description,
        re.IGNORECASE
    )
    if match_dims:
        l1_name = "DIMENSIONAL_PRODUCT"  # Default L1
        # Potential unit from regex (group 5 is `([A-Z]{2,})?`)
        unit = match_dims.group(5)
        if unit:
            l1_name = f"DIMENSIONAL_{unit.upper()}"
        l2_name = description.upper()
        return l1_name, l2_name

    # Pattern 7 (was 4): Code-like pattern (e.g., C0000000-0001)
    # A simple check: alphanumeric, possibly with hyphens, and mostly uppercase/digits, no spaces.
    if re.match(r"^[A-Z0-9-]+$", description) and not " " in description:
        if len(description) < 20:  # Avoid very long codes being miscategorized
            l1_name = "IDENTIFIED_CODES"
            l2_name = description.upper()
            return l1_name, l2_name

    # Fallback: Generic - L1 is the first word, L2 is the full description.
    words = description.split()
    if words:
        first_word = words[0].upper()
        if len(first_word) > 2 and not first_word.isdigit():  # Avoid short/numeric first words
            l1_name = first_word
        else:
            l1_name = "UNCATEGORIZED_L1"
        l2_name = description.upper()
        return l1_name, l2_name

    return "UNCATEGORIZED_L1", description.upper() if description else "UNCATEGORIZED_L2"


# --- Main Training Orchestration --- (Now for Parsing and DB Population)

def run_folder_generation_pipeline():
    """
    Orchestrates the new parsing-based folder generation.
    """
    print("ML Pipeline: Starting new folder generation logic...")

    # --- Clear relevant tables once at the beginning ---
    conn_clear = get_mysql_connection()
    if not conn_clear:
        print("ML Pipeline: DB connection failed, cannot clear tables. Aborting.")
        return
    cursor_clear = conn_clear.cursor()
    try:
        print("ML Pipeline: Clearing item_classifications and layer_definitions for parsed data...")
        cursor_clear.execute(
            f"DELETE FROM item_classifications WHERE layer_name LIKE 'L%_Parsed_Folders'")
        print(f"Deleted {cursor_clear.rowcount} from item_classifications.")
        cursor_clear.execute(
            f"DELETE FROM layer_definitions WHERE layer_name_db LIKE 'L%_Parsed_Folders'")
        print(f"Deleted {cursor_clear.rowcount} from layer_definitions.")
        conn_clear.commit()
    except Exception as e:
        print(f"ML Pipeline: Error clearing tables: {e}")
        conn_clear.rollback()
    finally:
        cursor_clear.close()
        conn_clear.close()

    all_po_items_df = fetch_item_data_for_ml()  # Fetches all rows with descriptions

    if all_po_items_df.empty:
        print("ML Pipeline: No item data fetched. Aborting folder generation.")
        return

    if 'description_for_embedding' not in all_po_items_df.columns:
        print("ML Pipeline: 'description_for_embedding' column is missing. Aborting.")
        return

    parsed_folders = []
    for index, row in all_po_items_df.iterrows():
        description = row['description_for_embedding']
        po_id = row['id']  # Original PO id

        l1_folder, l2_folder = parse_item_description_for_folders(description)
        parsed_folders.append({
            "po_id": po_id,
            "original_description": description,
            "l1_folder": l1_folder,
            "l2_folder": l2_folder
        })
        print(
            f"PO_ID: {po_id}, Desc: '{description}' -> L1: '{l1_folder}', L2: '{l2_folder}'")

    # --- Database Population ---
    # 1. Prepare L1 layer definitions
    unique_l1_folders = sorted(
        list(set(item['l1_folder'] for item in parsed_folders if item['l1_folder'])))
    l1_definitions_to_insert = []
    for l1_name in unique_l1_folders:
        l1_definitions_to_insert.append({
            "layer_name_db": "L1_Parsed_Folders",
            "cluster_label_id": l1_name,
            "descriptive_name": l1_name,
            "parent_layer_pk": None
        })

    create_and_populate_parsed_layer_definitions(l1_definitions_to_insert)
    print(
        f"ML Pipeline: Processed {len(unique_l1_folders)} L1 folder definitions.")

    # 2. Prepare L2 layer definitions and item_classifications
    # We need a connection to fetch L1 parent PKs during L2 definition creation
    conn_for_parent_pk = get_mysql_connection()
    if not conn_for_parent_pk:
        print("ML Pipeline: Cannot connect to DB to fetch L1 parent PKs for L2 definitions. Aborting further DB operations.")
        return
    cursor_for_parent_pk = conn_for_parent_pk.cursor()

    l2_definitions_to_insert = []
    item_l2_classifications_to_save = []

    # Group parsed items by L1 folder first
    items_by_l1 = {}
    for item in parsed_folders:
        if item['l1_folder']:
            if item['l1_folder'] not in items_by_l1:
                items_by_l1[item['l1_folder']] = []
            items_by_l1[item['l1_folder']].append(item)

    for l1_name, items_in_l1 in items_by_l1.items():
        parent_l1_pk = get_layer_definition_pk(
            "L1_Parsed_Folders", l1_name, cursor_for_parent_pk)
        if parent_l1_pk is None:
            print(
                f"Warning: Could not find PK for L1 folder '{l1_name}'. Skipping L2 definitions under it.")
            continue

        unique_l2_folders_in_l1 = sorted(
            list(set(item['l2_folder'] for item in items_in_l1 if item['l2_folder'])))

        for l2_name in unique_l2_folders_in_l1:
            l2_definitions_to_insert.append({
                "layer_name_db": "L2_Parsed_Folders",  # Generic layer_name for all L2 folders
                "cluster_label_id": l2_name,  # This is the full description, unique L2 folder name
                "descriptive_name": l2_name,
                "parent_layer_pk": parent_l1_pk
            })

            # For item_classifications, link items to this L2 folder
            for item_detail in items_in_l1:
                if item_detail['l2_folder'] == l2_name:
                    item_l2_classifications_to_save.append({
                        "item_po_id": item_detail['po_id'],
                        "item_description": item_detail['original_description'],
                        "cluster_label": l2_name,  # L2 folder name
                        "layer_name": "L2_Parsed_Folders"  # Matches L2 layer_definitions' layer_name_db
                    })

    if cursor_for_parent_pk:
        cursor_for_parent_pk.close()
    if conn_for_parent_pk and conn_for_parent_pk.is_connected():
        conn_for_parent_pk.close()

    create_and_populate_parsed_layer_definitions(l2_definitions_to_insert)
    print(
        f"ML Pipeline: Processed {len(l2_definitions_to_insert)} L2 folder definitions.")

    save_parsed_item_classifications(item_l2_classifications_to_save)
    print(
        f"ML Pipeline: Processed {len(item_l2_classifications_to_save)} L2 item classifications.")

    print("ML Pipeline: Folder generation and database population finished.")


if __name__ == "__main__":
    print("Running ML Folder Generation Pipeline directly for testing...")
    run_folder_generation_pipeline()
    print("\nFolder generation pipeline (parsing part) finished.")
