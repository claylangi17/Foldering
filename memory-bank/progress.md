# Progress: AI-Powered Purchase Order Classification System

## 1. What Works / Completed
- **Memory Bank Initialized & Updated**: All core documentation files are in place and regularly updated.
- **ETL Pipeline**: Functional ETL script (`etl/etl_script.py`) for SQL Server to MySQL data transfer and transformation.
- **Parsing-Based Folder Generation (`ml/training_pipeline.py`, `ml/inference.py`)**: Core logic for 2-level folder structure based on item description parsing.
- **Backend API (FastAPI)**:
    - Endpoints for ETL, folder generation, new item classification, and hierarchical layer/item data retrieval.
    - **Authentication & Authorization**:
        - User registration (`/auth/register`) and login (`/auth/token`) endpoints.
        - Password hashing (`security.py`) and JWT token creation.
        - User service (`auth_service.py`) for user management.
        - Dependency for current user (`dependencies.py`), including SPV role check.
        - `/auth/users/me` endpoint to get current user details.
        - Secured `PUT /purchase-orders/{po_id}` endpoint for SPV role.
    - **Cumulative per Item Feature**:
        - `classification_service.py` modified to calculate `Cumulative_Item_QTY` and `Cumulative_Item_Amount_IDR` via SQL window functions.
        - `po_schemas.py` updated with new cumulative fields.
    - **Mini Dashboard**:
        - Created `dashboard_schemas.py` for response model.
        - Created `dashboard_service.py` to aggregate data (total POs, total amount, L1/L2 category counts).
        - Created `dashboard_router.py` with `/mini-summary` endpoint.
        - Integrated dashboard router into `main.py`.
- **Frontend (Next.js + Shadcn UI)**:
    - ETL parameter form.
    - Layer navigation page (`/layers/[[...slug]]/page.tsx`):
        - Displays L1/L2 parsed folders and item tables.
        - Handles hierarchical navigation.
        - **Export to PDF**: Added button and functionality to export item table to PDF using `jspdf` and `jspdf-autotable`.
        - **Item Name Search**: Added client-side search input to filter items in the table by Item Name or Item Code.
        - **Filter by Folder/Month (Client-side)**:
            - Added search input to filter L1/L2 folder lists by name.
            - Added Year/Month select dropdowns to filter items by `TGL_PO`.
            - Corrected TypeScript errors related to `TGL_PO` date handling.
    - **Authentication & Authorization**:
        - Login (`/login`) and Register (`/register`) pages.
        - `AuthContext` for global state management (token, user, isAuthenticated, isLoading).
        - Protected route layout (`/(dashboard_layout)/layout.tsx`) redirecting to login if not authenticated.
        - Header in dashboard layout displaying user info (username, role).
    - **Checklist SPV Feature**:
        - `item-columns.tsx` modified to make "Checklist" editable only for 'spv' role. Added editable "Keterangan" field for SPV users with debounce logic.
        - `ChecklistCell` component uses `useAuth` and calls `updatePOChecklist` API.
        - `api.ts` includes `registerUser`, `loginUser`, `fetchCurrentUser`, `updatePOChecklist`, `updatePOKeterangan`, and `fetchMiniDashboardData`.
    - **Cumulative per Item Feature**:
        - `api.ts` updated for new cumulative fields in `FrontendItemInLayer`.
        - `item-columns.tsx` includes columns for "Cum. QTY" and "Cum. Amount (IDR)".
    - **Mini Dashboard**:
        - Created `mini-dashboard.tsx` component to display key metrics.
        - Integrated `MiniDashboard` into `/(dashboard_layout)/page.tsx`.
        - Added `separator` component via Shadcn CLI and fixed `EtlParameterForm` import.
- **Database (MySQL - `foldering_ai`)**: Schemas for `purchase_orders`, `layer_definitions`, `item_classifications`, and `users` are in place.
- **SETUP & VERSION CONTROL COMPLETE**: Project on GitHub `claylangi17/Foldering`.

## 2. What's Left to Build (High-Level)
- **Checklist SPV - Final Touches**:
    - Role management UI (currently manual DB edit).
    - More robust error handling and UI feedback for checklist updates.
    - Data refresh strategy after checklist update.
- **Further Refinement of Parsing Rules (Iterative)**.
- **Frontend Features (Review/Implement)**:
    - Consider backend enhancements for "Filter by Month" if client-side is insufficient.
- **UI/UX Enhancements**: Breadcrumbs with actual names, long name handling.
- **Cumulative Calculations within Folders**: Clarify if needed beyond current implementation.

## 3. Current Status
- **"Mini Dashboard" feature implemented.** Awaiting testing.
- **"Editable Keterangan" feature implemented.** SPV users can now edit the Keterangan field. Awaiting testing.
- **"Filter by Folder/Month" feature (Phase 1 - Client-side) implemented.** This includes folder name search and item date filtering. Awaiting testing.
- **"Item Name Search" feature implemented** (client-side). Awaiting testing.
- **"Export PDF" feature implemented** (client-side). PDF export now considers the filtered items from the search. Awaiting testing.
- **"Cumulative per Item" feature completed.**
- **"Checklist SPV" feature backend and frontend foundations are in place.** Next steps involve UI for role management and enhancing robustness.
- Core parsing-based folder system is functional.

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
- **2025-05-09**: Shifted from ML-based clustering to explicit rule-based parsing for item classification due to complexity and ambiguity of ML approach for current requirements.
- **2025-05-10**: Initialized Git repository for the project.
- **2025-05-10**: Decided to use `main` as the primary Git branch.
- **2025-05-10**: Resolved embedded Git repository issue with `frontend` by tracking its files directly in the main project.
- **2025-05-10**: Successfully pushed the initial version of the project to GitHub: `claylangi17/Foldering`.
