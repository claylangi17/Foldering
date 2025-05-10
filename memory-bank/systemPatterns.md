# System Patterns: AI-Powered Purchase Order Classification System

## 1. System Architecture Overview

The system will be composed of several key modules:

```mermaid
graph TD
    subgraph User Interaction
        Frontend[Next.js + Shadcn UI]
    end

    subgraph Backend Services
        API[FastAPI Application]
    end

    subgraph Data Processing
        ETL[ETL Pipeline: Python Script]
        ML[ML Pipeline: Python Script/Module]
    end

    subgraph Data Stores
        SQLServer[SQL Server (Source)]
        MySQL[MySQL (Application DB)]
    end

    User(User) --> Frontend
    Frontend --> API

    API --> ETL
    API --> ML
    API --> MySQL

    ETL --> SQLServer
    ETL --> MySQL
    ML --> MySQL

    %% Data Flow for ETL
    SQLServer -- "PO_ListProd Stored Proc" --> ETL
    ETL -- "Raw PO Data" --> MySQL
    ETL -- "Calculated Columns" --> MySQL

    %% Data Flow for ML
    MySQL -- "Item Descriptions" --> ML
    ML -- "Parsed Folder Definitions & Item Mappings" --> MySQL

    %% Data Flow for API
    Frontend -- "Requests (Get POs, Classify, Update)" --> API
    API -- "Data / Classification Results" --> Frontend
    API -- "Read/Write POs, Layers" --> MySQL
    API -- "Trigger ETL/ML" --> ETL
    API -- "Trigger ETL/ML" --> ML
```

### Component Descriptions:
- **SQL Server (Source)**: Existing database holding raw purchase order data, accessed via the `PO_ListProd` stored procedure.
- **ETL Pipeline (Python Script)**:
    - Connects to SQL Server using `pyodbc`.
    - Executes `PO_ListProd` with user-provided parameters.
    - Fetches data into a Pandas DataFrame.
    - Calculates additional columns (`Sum of Order Amount IDR`, cumulative fields).
    - Initializes `Checklist` (False) and `Keterangan` (empty).
    - Loads the transformed data into a designated table in MySQL.
    - Can be triggered via API or run on a schedule.
- **MySQL (Application DB)**:
    - Stores transformed and enriched PO data from the ETL process.
    - Stores parsed 2-level folder definitions (`layer_definitions` table: L1 folder names, L2 specific item names with parent links).
    - Stores mappings of each PO item to its L2 folder (`item_classifications` table).
    - Stores user-editable fields (`Checklist`, `Keterangan`).
    - Serves as the primary data source for the FastAPI backend.
- **ML Pipeline (Python Script/Module) - Now "Folder Generation Pipeline"**:
    - Reads item descriptions (e.g., `ITEM_DESC`, `ITEM`) from the MySQL `purchase_orders` table.
    - Applies a series of rule-based parsing logic (regex, string methods) to each unique item description to determine:
        - **L1 Folder Name**: A general category (e.g., "DUPLEX 450GSM", "MASTER CARTON").
        - **L2 Folder Name**: The specific item type, often the full description (e.g., "DUPLEX 450GSM/58.5X92CM").
    - Stores these L1 and L2 folder definitions in the `layer_definitions` table, establishing parent-child relationships.
    - Maps each PO item to its corresponding L2 folder name in the `item_classifications` table.
    - Includes functionality for re-generating folder structures if parsing logic is updated.
    - Classifies new, unseen items by applying the same parsing logic.
- **FastAPI Application (Backend API)**:
    - Provides RESTful API endpoints for the frontend.
    - **Data Retrieval**: Endpoints to fetch PO data, filter by L1/L2 folders, dates, search terms.
    - **ETL/Folder Generation Control**: Endpoints to trigger ETL runs and folder structure generation (formerly ML training).
    - **Classification Service**: Endpoint to classify a new item description using the parsing logic.
    - **Data Modification**: Endpoints to update `Checklist` and `Keterangan` fields for POs.
    - **Dashboard Data**: Endpoints to provide aggregated data for the mini-dashboard.
- **Next.js + Shadcn UI (Frontend)**:
    - User interface for interacting with the system.
    - Form for inputting ETL parameters (Company ID, period, item codes).
    - Displays PO data in tables.
    - Implements Google Drive-like navigation for L1 and L2 item folders.
    - Allows searching, filtering, and exporting data.
    - Enables users to edit `Checklist` and `Keterangan`.
    - Displays the mini-dashboard.

## 2. Key Design Patterns & Principles
- **Modular Design**: Code will be organized into distinct directories (`/etl`, `/ml`, `/api`, `/frontend`) with clear responsibilities for each module. This promotes maintainability and scalability.
- **Service-Oriented Backend**: FastAPI will expose specific services (data retrieval, classification, etc.) that the frontend can consume.
- **Repository Pattern (Optional but Recommended for API)**: For database interactions within FastAPI, a repository pattern can abstract data access logic, making the API controllers cleaner and testing easier.
- **Configuration Management**: Database connection strings, API keys (if any), model paths, and other configurations should be managed externally (e.g., environment variables, `.env` files) rather than hardcoded.
- **Asynchronous Operations (for long tasks)**: ETL and Folder Generation can be time-consuming. FastAPI's `async` capabilities and background tasks are leveraged.
- **Data Validation**: Pydantic models in FastAPI will be used for request and response validation. Input validation will also occur on the frontend.
- **Hierarchical Folder Structure**: The 2-level parsing provides a structured view, allowing users to explore data from general categories to specific item types.
- **Updatable Parsing Logic**: The folder generation pipeline can be re-run if parsing rules are improved or new item description patterns are identified.

## 3. Data Flow Details

### 3.1. Initial Data Load & ETL
1. User provides parameters (Company ID, dates, item codes) via Frontend.
2. Frontend sends parameters to FastAPI `/trigger-etl` endpoint.
3. FastAPI invokes the ETL script.
4. ETL script connects to SQL Server, executes `PO_ListProd`.
5. Data is processed (new columns added) in Pandas.
6. Transformed data is written to MySQL `purchase_orders` table.

### 3.2. Folder Generation & Initial Classification
1. Triggered via an API endpoint (e.g., `/train-ml-model` which now runs `run_folder_generation_pipeline`).
2. The script reads item descriptions from the `purchase_orders` table in MySQL.
3. Each description is parsed to determine L1 and L2 folder names.
4. Unique L1 folder names are stored in `layer_definitions` (parent_id=NULL, layer_name_db="L1_Parsed_Folders").
5. Unique L2 folder names (full descriptions) under each L1 are stored in `layer_definitions`, linked to their L1 parent's PK (layer_name_db="L2_Parsed_Folders").
6. Each PO item in `purchase_orders` is linked to its L2 folder name in `item_classifications` (layer_name="L2_Parsed_Folders", cluster_label=L2_folder_name).

### 3.3. New Item Classification (API)
1. User inputs a new item description via Frontend or another system calls the `/classify-new-item` API endpoint.
2. FastAPI receives the item description.
3. It applies the same parsing logic (`parse_item_description_for_folders`) to the new description.
4. The resulting L1 and L2 folder names are returned. (The system doesn't automatically create new definitions for these on-the-fly; folder definitions are only created during the main generation pipeline).

### 3.4. Frontend Data Display & Interaction
1. User navigates the Frontend.
2. Frontend calls FastAPI endpoints (e.g., `/classification/layers/L1`, `/classification/layers/L1/{l1_pk}/L2`, `/classification/item-details-by-layer-definition-pk/{l2_pk}`).
3. FastAPI queries MySQL based on request parameters (filters, search terms).
4. Data is returned to Frontend and displayed using Shadcn UI components.
5. User edits `Checklist` or `Keterangan` -> Frontend calls `/update-po/{po_id}` endpoint.
6. FastAPI updates the record in MySQL.

## 4. Folder Structure (Initial Proposal)
```
/project_root
├── /etl
│   ├── etl_script.py
│   └── utils.py  # (Optional: for common ETL functions)
├── /ml
│   ├── training_pipeline.py # Contains parsing logic and DB population for folders
│   ├── inference.py         # Contains parsing logic for new items
├── /api
│   ├── main.py      # (FastAPI app initialization)
│   ├── /routers     # (API endpoint definitions)
│   │   ├── po_router.py
│   │   ├── classification_router.py
│   │   └── etl_ml_router.py
│   ├── /schemas     # (Pydantic models)
│   ├── /services    # (Business logic, e.g., interacting with ML models)
│   └── /db          # (Database connection, repository/ORM setup)
├── /frontend
│   ├── /app         # (Next.js App Router)
│   │   ├── /(dashboard_layout)
│   │   │   ├── /layers
│   │   │   │   └── [[...slug]]/page.tsx # For L1/L2/L3 navigation
│   │   │   └── page.tsx                 # Main dashboard page
│   │   ├── /api       # (Next.js API routes, if needed for BFF pattern)
│   │   └── layout.tsx
│   ├── /components
│   │   ├── /ui        # (Shadcn UI components)
│   │   └── /custom    # (Custom composite components)
│   ├── /lib           # (Utility functions, API client)
│   ├── /hooks         # (Custom React hooks)
│   ├── next.config.js
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── /memory-bank       # (Project documentation)
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── techContext.md
│   ├── systemPatterns.md
│   ├── activeContext.md
│   └── progress.md
├── .env               # (Environment variables)
├── requirements.txt   # (Python dependencies)
└── package.json       # (Node.js dependencies for frontend)
```
This structure provides a good separation of concerns and aligns with the user's request for modularity.
