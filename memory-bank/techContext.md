# Technical Context: AI-Powered Purchase Order Classification System

## 1. Technology Stack

### 1.1. Backend
- **Language**: Python (version to be determined, recommend 3.9+)
- **Framework**: FastAPI
- **Database Connectivity**:
    - `pyodbc`: For connecting to SQL Server (source).
    - `mysql-connector-python`: For connecting to MySQL (destination and application database).
- **Data Handling**: Pandas
- **Item Description Parsing**:
    - Python's built-in `re` module for regular expressions.
    - Custom string manipulation logic.

### 1.2. Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: Shadcn UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide Icons
- **Language**: TypeScript (recommended for Next.js projects)

### 1.3. Databases
- **Data Source**: Microsoft SQL Server (existing, accessed via stored procedure `PO_ListProd`).
- **Application Database**: MySQL (for storing processed PO data, parsed folder definitions, item-to-folder mappings, and user-added information).

### 1.4. Classification Method
- **Primary Method**: Rule-based parsing of item descriptions using regular expressions and custom string logic to determine a 2-level folder structure.

## 2. Development Setup & Environment
- **Operating System**: User's system is Windows 11. Development should be compatible.
- **Python Environment**: Virtual environment (e.g., `venv` or `conda`) is highly recommended.
- **Node.js Environment**: Required for Next.js development (LTS version recommended).
- **Code Editor**: User is using VSCode.
- **Version Control**: Git (recommended, though not explicitly stated by user).

## 3. Technical Constraints & Considerations
- **SQL Server Access**: Requires ODBC driver for SQL Server to be installed and configured on the machine running the ETL script. Connection string details (server, database, credentials) will be needed.
- **MySQL Access**: MySQL server instance needs to be running and accessible. Database and table schemas need to be defined for `purchase_orders`, `layer_definitions`, and `item_classifications`.
- **Parsing Rule Maintenance**: The effectiveness of the folder structure heavily depends on the robustness and coverage of the parsing rules in `ml/training_pipeline.py`. As new item description patterns emerge, these rules will need ongoing refinement.
- **Real-time vs. Scheduled ETL**:
    - **Real-time**: Might introduce significant load on SQL Server and require robust error handling and queuing if the data volume is high.
    - **Scheduled**: Simpler to implement, less load on the source, but data will not be instantly up-to-date. The user mentioned "real-time or terjadwal," so this needs clarification or a flexible design. (Current implementation is API-triggered).
- **Scalability**: The design should consider potential growth in data volume and user load. Parsing performance for a very large number of unique descriptions should be monitored.
- **Security**: Database credentials and API endpoints should be secured.
- **Modularity**: The request emphasizes a clean, modular code structure (`/etl`, `/ml`, `/api`, `/frontend`).

## 4. Key Technical Decisions to Be Made
- **Parsing Rule Development and Refinement Strategy**: How to systematically identify new patterns and update parsing logic.
- **ETL Trigger Mechanism**: How will the ETL process be initiated? Manually via an API call (current), or automatically on a schedule?
- **Database Schema Design**: `layer_definitions` now stores parsed folder names as `cluster_label_id` and `descriptive_name`. `item_classifications` links PO items to their L2 folder name.
- **API Endpoint Design**: Specific routes, request/response formats for FastAPI.
- **State Management (Frontend)**: How will application state be managed in Next.js (e.g., React Context, Zustand, Redux Toolkit)? For Shadcn UI, often simpler state management is sufficient.
- **Error Handling and Logging**: Robust error handling and logging strategy across all components.
