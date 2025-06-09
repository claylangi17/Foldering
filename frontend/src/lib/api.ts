import { PurchaseOrder } from "@/app/(dashboard_layout)/po-data/columns"; // Assuming type is defined here

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchPOParams {
    page?: number;
    limit?: number;
    search_value?: string; // Renamed from 'search' for clarity, holds the search term
    search_field?: string; // Specifies which field to search against (e.g., 'PO_NO', 'Keterangan')
    // Add other filter params as needed
    // layer_filter?: string;
    // month_filter?: number;
}

export async function fetchPurchaseOrders(token: string, params: FetchPOParams = {}): Promise<{ items: PurchaseOrder[], total: number }> {
    const { page = 1, limit = 10, search_value, search_field } = params;
    const queryParams = new URLSearchParams({
        skip: ((page - 1) * limit).toString(),
        limit: limit.toString(),
    });

    if (search_value) {
        if (search_field && search_field !== 'ALL') {
            queryParams.append("search_field", search_field);
            queryParams.append("search_value", search_value);
        } else {
            // If search_field is 'ALL' or not provided, use generic search
            queryParams.append("search", search_value);
        }
    }
    // Add other filters to queryParams if they exist

    try {
        console.log(`Fetching POs from: ${API_BASE_URL}/purchase-orders?${queryParams.toString()}`);
        const response = await fetch(`${API_BASE_URL}/purchase-orders?${queryParams.toString()}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error fetching POs" }));
            console.error("API Error fetching POs:", response.status, errorData);
            throw new Error(errorData.detail || `Failed to fetch purchase orders: ${response.statusText}`);
        }

        const responseData = await response.json(); // Expect { items: [], total: 0 }
        // Ensure data matches the PurchaseOrder type, especially date fields
        const items = responseData.items.map((po: any) => ({
            ...po,
            // Example: Convert date strings to Date objects if necessary for client-side formatting/logic
            // TGL_PO: po.TGL_PO ? new Date(po.TGL_PO) : new Date(), 
        }));
        return { items, total: responseData.total };
    } catch (error) {
        console.error("Error in fetchPurchaseOrders:", error);
        // In a real app, you might want to throw a more specific error or handle it differently
        throw error;
    }
}

export async function updatePOKeterangan(poId: number, keterangan: string, token: string): Promise<FrontendItemInLayer> {
    if (poId === undefined || poId === null) {
        const errorMessage = "PO ID is missing. Cannot update keterangan.";
        console.error("updatePOKeterangan validation error:", errorMessage);
        throw new Error(errorMessage);
    }
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ Keterangan: keterangan }),
        });
        const result = await response.json();
        if (!response.ok) {
            const errorDetail = result.detail || `Failed to update Keterangan for PO ID ${poId}. Status: ${response.status}`;
            throw new Error(errorDetail);
        }
        return result as FrontendItemInLayer;
    } catch (error) {
        console.error(`Error in updatePOKeterangan for PO ID ${poId}:`, error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(String(error) || `Unknown error updating Keterangan for PO ID ${poId}`);
        }
    }
}

// --- Dashboard Functions ---
export interface MiniDashboardData {
    total_purchase_orders: number;
    total_order_amount_idr: number;
    total_l1_categories: number;
    total_l2_categories: number;
}

export async function fetchMiniDashboardData(token: string): Promise<MiniDashboardData> {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard/mini-summary`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || "Failed to fetch mini dashboard data");
        }
        return result as MiniDashboardData;
    } catch (error) {
        console.error("Error in fetchMiniDashboardData:", error);
        throw error;
    }
}


export async function triggerEtlProcess(etlParams: any): Promise<any> {
    try {
        const response = await fetch(`${API_BASE_URL}/process/trigger-etl`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(etlParams),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || "Failed to trigger ETL process via API");
        }
        return result;
    } catch (error) {
        console.error("Error in triggerEtlProcess:", error);
        throw error;
    }
}

// Assuming LayerNode schema is defined and can be imported or defined here for frontend use
// For now, using 'any' for return types from layer APIs until frontend schemas are solidified.
// Ideally, you'd have a frontend/src/types/classification.ts or similar.
export interface FrontendLayerNode {
    id: string; // This is the layer_definition primary key
    name: string;
    item_count: number; // Number of direct sub-layers/sub-categories
    total_po_count?: number; // Total number of POs under this layer (including descendants)
    level: number; // 1, 2, or 3
    parent_id?: string | null; // This is the parent layer_definition primary key
}

// Define the new response type for fetchLayerData
export interface FrontendLayerHierarchyResponse {
    parent_name: string | null;
    layers: FrontendLayerNode[];
}

export interface FrontendItemInLayer {
  id: number; // This should be the PO's primary key from the database (purchase_orders.id)
  Checklist: boolean;
  Keterangan: string | null;
  
  // Core PO Fields from database schema
  PO_NO?: string; // Changed from PO_No to PO_NO
  TGL_PO?: string; // Date as string, maps to TGL_PO (datetime)
  ITEM?: string; // Item code/identifier, maps to ITEM (text)
  ITEM_DESC?: string; // maps to ITEM_DESC (text)
  QTY_ORDER?: number; // maps to QTY_ORDER (double)
  UNIT?: string; // maps to UNIT (text)
  Original_PRICE?: number; // maps to Original_PRICE (double)
  Currency?: string; // maps to Currency (text)
  Order_Amount_IDR?: string; // Individual item amount, maps to Order_Amount_IDR (double), store as string for display
  Supplier_Name?: string; // maps to Supplier_Name (text)
  company_code?: string; // maps to company_code (int), ensure consistency if using string
  
  // Purchase Requisition (PR) Fields
  PR_No?: string; // maps to PR_No (text)
  PR_Date?: string; // Date as string, maps to PR_Date (datetime)
  PR_Ref_A?: string; // maps to PR_Ref_A (text)
  PR_Ref_B?: string; // maps to PR_Ref_B (text)
  
  // PO Status and Terms
  Term_Payment_at_PO?: string; // maps to Term_Payment_at_PO (text)
  RECEIVED_DATE?: string; // Date as string, maps to RECEIVED_DATE (datetime)
  PO_Status?: string; // maps to PO_Status (text)
  
  // Summaries and Cumulative Values
  Sum_of_Order_Amount_IDR?: string; // Total order amount for this PO/Item, maps to Sum_of_Order_Amount_IDR (double)
  Cumulative_Item_QTY?: number; // maps to Cumulative_Item_QTY (double)
  Cumulative_Item_Amount_IDR?: string; // maps to Cumulative_Item_Amount_IDR (double)
  Total_Cumulative_QTY_Order?: number; // maps to Total_Cumulative_QTY_Order (double)
  Total_Cumulative_IDR_Amount?: string; // maps to Total_Cumulative_IDR_Amount (double)

  // Fields potentially from other sources or calculations (review if needed)
  PPN_Amount?: number;
  PPH_Amount?: number;

  // Internal frontend fields
  db_id: number; // Potentially redundant if 'id' is the PO's DB PK. Review usage. Kept for now.
  layer_definition_pk: number; // Specific to layer context
  _showDetails?: () => void; // UI Helper

  // Aliases if used by other parts of frontend, prefer direct mapping above
  // UOM?: string; // Alias for UNIT
  // QTY?: number; // Alias for QTY_ORDER
}

export async function fetchLayerData(slugParts: string[], token: string): Promise<FrontendLayerHierarchyResponse> {
    console.log(`api.ts: fetchLayerData - ENTER - slug: ${slugParts.join('/')}, token: ${token ? token.substring(0,10)+'...' : 'null'}`);
    if (!slugParts || slugParts.length === 0) {
        console.error("fetchLayerData: slugParts cannot be empty.");
        return { parent_name: null, layers: [] }; // Return default structure
    }
    const slug = slugParts.join('/');
    try {
        const url = `${API_BASE_URL}/classification/layers/${slug}`;
        console.log(`api.ts: fetchLayerData - ABOUT TO FETCH from ${url}. Token for Authorization header: ${token ? token.substring(0,10)+'...' : 'null'}`);
        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error fetching layer data" }));
            console.error("API Error fetching layer data:", response.status, errorData);
            throw new Error(errorData.detail || `Failed to fetch layer data: ${response.statusText}`);
        }
        // The API now returns an object: { parent_name: string | null, layers: FrontendLayerNode[] }
        const data: FrontendLayerHierarchyResponse = await response.json();
        return data;
    } catch (error) {
        console.error("Error in fetchLayerData:", error);
        // Consider returning a default FrontendLayerHierarchyResponse structure on error.
        throw error;
    }
}

// Define the new response type for fetchItemsForLayerDefinitionPk
export interface LayerItemsResponse {
    layer_name: string;
    items: FrontendItemInLayer[];
}

export async function fetchItemsForLayerDefinitionPk(layerDefinitionPk: number, token: string): Promise<LayerItemsResponse> {
    console.log(`api.ts: fetchItemsForLayerDefinitionPk - ENTER - pk: ${layerDefinitionPk}, token: ${token ? token.substring(0,10)+'...' : 'null'}`);
    if (layerDefinitionPk <= 0) {
        console.error("fetchItemsForLayerDefinitionPk: layerDefinitionPk must be a positive number.");
        // Return a default structure that matches LayerItemsResponse
        return { layer_name: "Invalid Layer PK", items: [] };
    }
    try {
        const url = `${API_BASE_URL}/classification/item-details-by-layer-definition-pk/${layerDefinitionPk}`;
        console.log(`Fetching Items for Layer Definition PK from: ${url}`);
        console.log(`api.ts: fetchItemsForLayerDefinitionPk - ABOUT TO FETCH from ${url}. Token for Authorization header: ${token ? token.substring(0,10)+'...' : 'null'}`);
    const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error fetching items for layer definition pk" }));
            console.error("API Error fetching items for layer definition pk:", response.status, errorData);
            throw new Error(errorData.detail || `Failed to fetch items for layer definition pk: ${response.statusText}`);
        }
        // The API now returns an object: { layer_name: string, items: FrontendItemInLayer[] }
        const data: LayerItemsResponse = await response.json();
        return data;
    } catch (error) {
        console.error("Error in fetchItemsForLayerDefinitionPk:", error);
        // Ensure the thrown error or a default response is returned in case of an error
        // For simplicity, re-throwing. Consider returning a default LayerItemsResponse structure on error.
        throw error;
    }
}

export async function classifyNewItemAPI(description: string): Promise<any> {
    // Renamed from classifyNewItem to avoid conflict if this file is imported elsewhere
    // where classifyNewItem might already exist.
    try {
        const queryParams = new URLSearchParams({ item_description: description });
        const url = `${API_BASE_URL}/process/classify-new-item?${queryParams.toString()}`;
        console.log(`Classifying new item via API: ${url}`);
        // Note: The backend endpoint for classify-new-item is a POST in etl_ml_router.py,
        // but the Query() suggests it might expect GET. Let's assume GET for now based on Query().
        // If it's POST, this needs to change.
        // The current etl_ml_router.py has:
        // @router.post("/classify-new-item", status_code=200)
        // async def classify_new_item(item_description: str = Query(..., description="...")):
        // This is unusual. A POST request usually takes data in the body.
        // Let's assume it's meant to be a GET or the backend needs adjustment.
        // For now, sticking to GET as per Query() usage in backend.
        // If it's POST with body:
        // const response = await fetch(`${API_BASE_URL}/process/classify-new-item`, {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({ item_description: description })
        // });

        // Correcting to POST as per backend router decorator, but data via query param as per FastAPI param def
        // This is still a bit odd. Usually POST data is in body.
        // If the backend truly expects POST with query params:
        const postUrl = `${API_BASE_URL}/process/classify-new-item?item_description=${encodeURIComponent(description)}`;
        const response = await fetch(postUrl, { method: "POST" });


        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error classifying item" }));
            console.error("API Error classifying item:", response.status, errorData);
            throw new Error(errorData.detail || `Failed to classify item: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.message && result.message.includes("Placeholder")) {
            console.warn(`classifyNewItemAPI for ${description} received placeholder response: ${result.message}`);
        }
        return result;
    } catch (error) {
        console.error("Error in classifyNewItemAPI:", error);
        throw error;
    }
}

// TODO: updatePOField(poId, field, value)

// --- Auth Functions ---

export interface UserCreateData {
    username: string;
    email?: string | null;
    full_name?: string | null;
    password_to_hash: string; // Field name expected by UserCreate schema if password is the key
    // Actually, UserCreate schema expects 'password'. Let's match that.
}

// Re-aligning with UserCreate schema from backend (api/schemas/user_schemas.py)
// UserCreate(UserBase): password: str
// UserBase: username, email, full_name, company_code, disabled
export interface FrontendUserCreateData {
    username: string;
    email?: string | null;
    full_name?: string | null;
    company_code?: number | null;
    password: string;
}

export interface UserResponse { // Corresponds to User schema in backend
    id: number;
    username: string;
    email?: string | null;
    full_name?: string | null;
    company_code?: number | null;
    role: string;
    disabled?: boolean | null;
}

export interface TokenResponse { // Corresponds to Token schema in backend
    access_token: string;
    token_type: string;
}

export async function registerUser(userData: FrontendUserCreateData): Promise<UserResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || "Failed to register user");
        }
        return result as UserResponse;
    } catch (error) {
        console.error("Error in registerUser:", error);
        throw error;
    }
}

export async function loginUser(username: string, password_to_submit: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password_to_submit); // FastAPI's OAuth2PasswordRequestForm expects 'password'

    try {
        const response = await fetch(`${API_BASE_URL}/auth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || "Failed to login");
        }
        return result as TokenResponse;
    } catch (error) {
        console.error("Error in loginUser:", error);
        throw error;
    }
}

export async function fetchCurrentUser(token: string): Promise<UserResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });
        const result = await response.json();
        if (!response.ok) {
            // If token is invalid or expired, backend will return 401
            // which will be caught here.
            throw new Error(result.detail || "Failed to fetch current user");
        }
        return result as UserResponse;
    } catch (error) {
        console.error("Error in fetchCurrentUser:", error);
        throw error; // Re-throw to be handled by AuthContext or calling component
    }
}

export interface Company {
    company_code: number;
    name: string;
}

export async function fetchCompanies(): Promise<Company[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/companies`);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || "Failed to fetch companies");
        }
        return result as Company[];
    } catch (error) {
        console.error("Error in fetchCompanies:", error);
        throw error;
    }
}

export async function updatePOChecklist(poId: number, checklistStatus: boolean, token: string): Promise<FrontendItemInLayer> {
    if (poId === undefined || poId === null) {
        const errorMessage = "PO ID is missing. Cannot update checklist.";
        console.error("updatePOChecklist validation error:", errorMessage);
        throw new Error(errorMessage);
    }
    try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ Checklist: checklistStatus }), // Send only the Checklist field
        });
        const result = await response.json();
        if (!response.ok) {
            const errorDetail = result.detail || `Failed to update checklist for PO ID ${poId}. Status: ${response.status}`;
            throw new Error(errorDetail);
        }
        return result as FrontendItemInLayer; // Assuming the backend returns the updated PO item
    } catch (error) {
        console.error(`Error in updatePOChecklist for PO ID ${poId}:`, error);
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(String(error) || `Unknown error updating checklist for PO ID ${poId}`);
        }
    }
}
