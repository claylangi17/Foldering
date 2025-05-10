# Project Brief: AI-Powered Purchase Order Classification System

## 1. Overview
The user wants to build an integrated data system and web application for classifying purchase orders. The system will involve:
- Data extraction from SQL Server.
- ETL processing and storage in MySQL.
- An item description parsing pipeline for rule-based folder generation.
- A FastAPI backend for API services.
- A Next.js frontend with Shadcn UI for user interaction and data display.

## 2. Key Components and Requirements

### 2.1. Data Source & ETL
- **Source**: SQL Server, stored procedure `PO_ListProd` (7 parameters: Company ID, From Month, From Year, To Month, To Year, From Item Code, To Item Code).
- **Extraction**: Via ODBC (`pyodbc`).
- **Destination**: MySQL, real-time or scheduled.
- **Transformations**: Add new programmatic columns:
    - `Sum of Order Amount IDR`: QTY × Harga
    - `Total Cumulative QTY_Order`: Cumulative QTY ordered by date.
    - `Total Cumulative IDR Amount`: Cumulative total IDR amount.
    - `Checklist`: Boolean, user-editable (default: False).
    - `Keterangan`: Text field, user-editable.
  These columns will be in MySQL and modifiable via the frontend.

### 2.2. Folder Generation Strategy (Rule-Based Parsing)
- **Method**: Item descriptions will be parsed using regular expressions and string manipulation to determine a 2-level folder structure.
    - **Layer 1 (L1 Folder)**: Represents a general category derived from the item description (e.g., "DUPLEX 450GSM", "MASTER CARTON", "PLYWOOD").
    - **Layer 2 (L2 Folder/Specific Item)**: Represents the specific item type, often the full item description (e.g., "DUPLEX 450GSM/58.5X92CM", "MASTER CARTON JDP63-09ELM"). This level directly lists the purchase orders.
- **Parsing Logic**: Implemented in `ml/training_pipeline.py` and `ml/inference.py`, using a series of prioritized rules (e.g., matching "MATERIAL GSM/SIZE", "MASTER CARTON", "PLYWOOD", item codes, and a fallback to first word).
- **Storage**: Parsed folder definitions (L1 and L2 names, parent-child relationships) stored in the `layer_definitions` table in MySQL. Each PO item is linked to its L2 folder in `item_classifications`.
- **API**: FastAPI endpoint for classifying new items based on this parsing logic.

### 2.3. Frontend Website (Next.js + Shadcn UI)
- **UI/UX**: Google Drive-like navigation (Layer 1 Folder → Layer 2 Folder/Specific Item). Clicking an L2 Folder displays the related PO table.
- **Components**: Accordion, table, input, checkbox, editable textarea.
- **PO Table Columns**: PR_No, PO_No, TGL_PO, ITEM, ITEM_DESC, QTY_ORDER, Supplier_Name, Original_PRICE (was IDR_PRICE), Currency, UNIT, PR_Date, PR_Ref_A, PR_Ref_B, Term_Payment_at_PO (was Term_Payment), RECEIVED_DATE, Sum_of_Order_Amount_IDR, Checklist, Keterangan, plus other relevant PO fields.
- **Features**:
    - Parameter input form (Company ID, Period, Item Code range).
    - Item name search (functionality to be reviewed based on new folder structure).
    - Filter by L1/L2 Folder or month.
    - Export to Excel/CSV.

### 2.4. Technology Stack
- **Backend**: Python, FastAPI, pyodbc, pandas, mysql-connector, re (for regex).
- **Frontend**: Next.js 14 (App Router), Shadcn UI, Tailwind CSS, Lucide Icons.
- **Databases**: SQL Server (source), MySQL (classification dashboard).
- **Classification Method**: Rule-based parsing of item descriptions.

### 2.5. Additional Features
- FastAPI endpoint for new item classification (using parsing).
- Editable `Checklist` and `Keterangan` fields in UI.
- Mini dashboard (total POs, total amount, category count, etc.).
- Modular pipeline for updating parsing logic and regenerating folders.
- Clean, modular code structure: `/etl`, `/ml`, `/api`, `/frontend`.

## 3. Deliverables Requested
- Complete system architecture.
- Project folder structure.
- Python ETL script + data transformation.
- Python scripts for parsing-based folder generation.
- FastAPI backend with classification (parsing-based) and data retrieval endpoints.
- Next.js + Shadcn UI frontend with specified features.
