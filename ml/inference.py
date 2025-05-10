import os
import sys
import re  # Added for regex parsing
from typing import Dict, Any, Tuple  # Corrected Tuple import
from dotenv import load_dotenv

# Add project root to sys.path to allow sibling imports
current_dir_ml_inf = os.path.dirname(os.path.abspath(__file__))
project_root_ml_inf = os.path.dirname(current_dir_ml_inf)
sys.path.append(project_root_ml_inf)

# Load environment variables
# Ensure .env is re-read if script is run after other modules
load_dotenv(override=True)

# --- Parsing Logic (copied from training_pipeline.py for now) ---


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


# --- Inference Function ---

def classify_item_by_parsing(description: str) -> Dict[str, Any]:
    """
    Classifies an item description into L1 and L2 folder names using parsing rules.
    Returns a dictionary with classification info.
    """
    print(f"ML Inference (Parsing): Classifying description: '{description}'")

    l1_folder, l2_folder = parse_item_description_for_folders(description)

    result = {
        "input_description": description,
        "l1_folder": l1_folder,
        "l2_folder": l2_folder,  # This is the specific item identifier / L2 folder name
        "error": None  # No error from parsing itself, unless description is None/empty handled in parse_
    }

    # If l1_folder or l2_folder is None or "UNCATEGORIZED", it means parsing didn't find a specific rule.
    # This is not an "error" in the sense of a system failure, but rather a classification outcome.
    if not l1_folder or not l2_folder:
        print(
            f"ML Inference (Parsing): Description '{description}' resulted in one or more default categories.")

    print(f"ML Inference (Parsing): Classification result: {result}")
    return result


if __name__ == "__main__":
    print("Running ML Inference module (Parsing Logic) directly for testing...")

    test_descriptions = [
        "DUPLEX 450GSM/ 58.5X92CM",
        "MASTER CARTON JDP63-09ELM",
        "PLYWOOD 1220X2440X18MM",
        "C0000000-0001",
        "MIDNIGHT BLACK PATRI",
        "MC WMT 4PK DPSQ BOX",
        "3M DOUBLE TAPE 9007 12MMX50M",
        "SF K150/M125 E/F / 51X71.5CM",
        "SHORT ITEM",
        "12345",
        ""
    ]

    for desc in test_descriptions:
        classification = classify_item_by_parsing(desc)
        print(f"\nClassification for '{desc}': {classification}")
