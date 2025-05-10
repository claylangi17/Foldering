# Progress: AI-Powered Purchase Order Classification System

## 1. What Works / Completed
- **Memory Bank Initialized & Updated**: All core documentation files are in place and have been updated to reflect the shift to a parsing-based classification system.
- **ETL Pipeline**: Functional ETL script (`etl/etl_script.py`) to extract data from SQL Server, perform transformations (add calculated columns, default user-editable fields), and load into MySQL `purchase_orders` table. Triggerable via API.
- **Parsing-Based Folder Generation (`ml/training_pipeline.py`)**:
    - Reads item descriptions from `purchase_orders`.
    - Implemented and refined `parse_item_description_for_folders` with new patterns (INK, TONER, dimensional products) and re-ordered rules for better specificity.
    - Populates `layer_definitions` with L1 and L2 folder names, including parent-child links between L1 and L2.
    - Populates `item_classifications` linking each PO item to its L2 folder name.
    - Includes logic to clear previous parsed data before regeneration.
- **New Item Classification (`ml/inference.py`)**:
    - `classify_item_by_parsing` function uses the same *refined* parsing logic as in `training_pipeline.py` to determine L1/L2 folders for new descriptions.
- **Backend API (FastAPI)**:
    - `/process/trigger-etl`: Successfully triggers the ETL.
    - `/process/train-ml-model`: Successfully triggers the `run_folder_generation_pipeline`.
    - `/process/classify-new-item`: Uses parsing logic for new items.
    - `/classification/layers/{slug:path}`: Fetches L1 and L2 folder definitions hierarchically.
    - `/classification/item-details-by-layer-definition-pk/{pk}`: Fetches PO items for a given L2 folder.
    - Pydantic schemas updated for data validation.
    - Services (`classification_service.py`) updated for new data fetching logic.
- **Frontend (Next.js + Shadcn UI)**:
    - ETL parameter form successfully triggers backend ETL.
    - `/layers/[[...slug]]/page.tsx`:
        - Displays L1 parsed folders.
        - Allows navigation to L2 parsed folders (specific item types).
        - Displays a table of PO items when an L2 folder is selected, showing all requested columns.
        - Handles URL slug parsing for hierarchical navigation.
        - `React.use(params)` implemented for compatibility.
- **Database (MySQL - `foldering_ai`)**:
    - `purchase_orders` table populated by ETL.
    - `layer_definitions` table populated with L1 and L2 parsed folder names and hierarchy.
    - `item_classifications` table links POs to their L2 folder names.
- **Troubleshooting**: Resolved various issues related to Python module imports, `.env` parsing, database access, Pandas indexing, Pydantic model mapping, and frontend data display.

## 2. What's Left to Build (High-Level - based on original brief, adapted for parsing)
- **Further Refinement of Parsing Rules (Iterative)**: While initial refinements (INK, TONER, dimensional) are complete, the parsing logic will likely need ongoing refinement based on more diverse item descriptions to improve accuracy and reduce "UNCATEGORIZED" items.
- **Frontend Features (Review/Implement)**:
    - **Item Name Search**: Functionality needs to be reviewed. Search could target L1/L2 folder names or item descriptions within the PO table.
    - **Filter by Folder/Month**: Filtering capabilities for the displayed PO item lists.
    - **Export to Excel/CSV**: For PO data tables.
    - **Editable `Checklist` and `Keterangan`**: Requires backend endpoints to update these fields in `purchase_orders` and UI components for editing.
    - **Mini Dashboard**: Displaying total POs, total amount, category count, etc.
- **User Interface/User Experience (UI/UX) Enhancements**:
    - Display actual folder names in breadcrumbs instead of "Node XXX".
    - Improve display of L1/L2 folder names if they become too long.
    - Consider UI for managing/suggesting parsing rules if desired.
- **Cumulative Calculations within Folders**: The request "kumulatif QTY/IDR (berdasarkan komulatif dalam folder layer 2)" implies that cumulative sums might need to be calculated dynamically when viewing items within an L2 folder, or pre-calculated specifically for each L2 group. Current cumulative sums are across all data loaded by ETL. This needs clarification.

## 3. Current Status
- **Refinement & Testing Phase**: The core 2-level parsing-based folder generation and display system is functional with initial rule refinements.
- **Ready for User Testing (with Refined Rules)**: The system is ready for the user to test the ETL, folder generation (using the updated parsing rules), and UI navigation with their actual data.
- **Awaiting Feedback for Further Parsing Refinement**: Continued improvements to parsing accuracy will depend on user feedback and more examples of item descriptions.

## 4. Known Issues / Blockers (Potential)
- **SQL Server Connectivity**: ODBC driver and connection parameters must be correctly configured.
- **MySQL Setup**: MySQL server must be running and accessible.
- **Parsing Rule Robustness**: While initial refinements have been made, the parsing rules may still not cover all item description variations. Descriptions not matching specific patterns will fall into generic categories (e.g., "UNCATEGORIZED_L1"). This remains an area for ongoing attention and iterative improvement.
- **Performance**: Parsing performance for a very large number of unique item descriptions during folder generation should be monitored. Database query performance for fetching layers/items with many entries.
- **Scalability of Parsing Rules**: If the number of distinct item patterns becomes very large, managing a long list of regex/if-else rules could become complex.

## 5. Evolution of Project Decisions
- **Shift in Classification Method**: Changed from an initial 3-level KMeans clustering approach to a 2-level rule-based parsing system for folder generation. This was based on user clarification that the "foldering" was more about pattern extraction (e.g., "DUPLEX 450GSM" as L1, "DUPLEX 450GSM/58.5X92CM" as L2) rather than unsupervised semantic clustering.
- **Database Schema for Layers**: `layer_definitions` now stores parsed folder names as `cluster_label_id` and `descriptive_name`. `item_classifications` links PO items directly to their L2 folder name.
- **API for Layers**: Modified to support slug-based navigation reflecting the L1/L2 parsed folder hierarchy.
- **ETL Trigger**: Implemented as API-triggered; scheduling can be added later if needed.
