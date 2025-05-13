import { PurchaseOrder } from "@/app/(dashboard_layout)/po-data/columns"; // Assuming type is defined here

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchPOParams {
    page?: number;
    limit?: number;
    search?: string;
    // Add other filter params as needed
    // layer_filter?: string;
    // month_filter?: number;
}

export async function fetchPurchaseOrders(params: FetchPOParams = {}): Promise<PurchaseOrder[]> {
    const { page = 1, limit = 10, search } = params;
    const queryParams = new URLSearchParams({
        skip: ((page - 1) * limit).toString(),
        limit: limit.toString(),
    });

    if (search) {
        queryParams.append("search", search);
    }
    // Add other filters to queryParams if they exist

    try {
        console.log(`Fetching POs from: ${API_BASE_URL}/purchase-orders?${queryParams.toString()}`);
        const response = await fetch(`${API_BASE_URL}/purchase-orders?${queryParams.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error fetching POs" }));
            console.error("API Error fetching POs:", response.status, errorData);
            throw new Error(errorData.detail || `Failed to fetch purchase orders: ${response.statusText}`);
        }

        const data: PurchaseOrder[] = await response.json();
        // Ensure data matches the PurchaseOrder type, especially date fields
        // The backend currently returns dates as strings if not processed by Pydantic into datetime objects
        // and then back to strings in a specific format.
        // For now, assuming the structure matches. May need transformation here.
        return data.map(po => ({
            ...po,
            // Example: Convert date strings to Date objects if necessary for client-side formatting/logic
            // TGL_PO: po.TGL_PO ? new Date(po.TGL_PO) : new Date(), 
            // This depends on how backend serializes dates and how columns.tsx expects them.
            // The current columns.tsx handles string or Date for TGL_PO.
        }));
    } catch (error) {
        console.error("Error in fetchPurchaseOrders:", error);
        // In a real app, you might want to throw a more specific error or handle it differently
        throw error;
    }
}

export async function updatePOKeterangan(poId: number, keterangan: string, token: string): Promise<FrontendItemInLayer> {
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
            throw new Error(result.detail || `Failed to update Keterangan for PO ID ${poId}`);
        }
        return result as FrontendItemInLayer;
    } catch (error) {
        console.error(`Error in updatePOKeterangan for PO ID ${poId}:`, error);
        throw error;
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
    item_count: number;
    level: number; // 1, 2, or 3
    parent_id?: string | null; // This is the parent layer_definition primary key
}

// Define the new response type for fetchLayerData
export interface FrontendLayerHierarchyResponse {
    parent_name: string | null;
    layers: FrontendLayerNode[];
}

export interface FrontendItemInLayer {
    // These should match the fields in api/schemas/po_schemas.py PurchaseOrder model
    id: number; // Will be stringified by service if needed, but keep as number if that's the true type
    PO_No?: string | null;
    ITEM?: string | null;
    ITEM_DESC?: string | null;
    Supplier_Name?: string | null;
    QTY_ORDER?: number | null;
    Original_PRICE?: number | null;
    Currency?: string | null;
    TGL_PO?: string | null; // Pydantic will serialize datetime to ISO string
    // Add other fields from the user's list that are in PurchaseOrderBase
    PR_No?: string | null;
    UNIT?: string | null;
    PR_Date?: string | null;
    PR_Ref_A?: string | null;
    PR_Ref_B?: string | null;
    Term_Payment_at_PO?: string | null;
    RECEIVED_DATE?: string | null;
    Sum_of_Order_Amount_IDR?: number | null;
    // Global cumulative fields from ETL (if still needed/used)
    Total_Cumulative_QTY_Order?: number | null;
    Total_Cumulative_IDR_Amount?: number | null;
    // New per-item cumulative fields
    Cumulative_Item_QTY?: number | null;
    Cumulative_Item_Amount_IDR?: number | null;
    // Checklist and Keterangan are also part of PurchaseOrderBase
    Checklist?: boolean | null;
    Keterangan?: string | null;
}

export async function fetchLayerData(slugParts: string[]): Promise<FrontendLayerHierarchyResponse> {
    if (!slugParts || slugParts.length === 0) {
        console.error("fetchLayerData: slugParts cannot be empty.");
        return { parent_name: null, layers: [] }; // Return default structure
    }
    const slug = slugParts.join('/');
    try {
        const url = `${API_BASE_URL}/classification/layers/${slug}`;
        console.log(`Fetching Layer Data from: ${url}`);
        const response = await fetch(url);

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

export async function fetchItemsForLayerDefinitionPk(layerDefinitionPk: number): Promise<LayerItemsResponse> {
    if (layerDefinitionPk <= 0) {
        console.error("fetchItemsForLayerDefinitionPk: layerDefinitionPk must be a positive number.");
        // Return a default structure that matches LayerItemsResponse
        return { layer_name: "Invalid Layer PK", items: [] };
    }
    try {
        const url = `${API_BASE_URL}/classification/item-details-by-layer-definition-pk/${layerDefinitionPk}`;
        console.log(`Fetching Items for Layer Definition PK from: ${url}`);
        const response = await fetch(url);

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
    // password: string; 
}
// Re-aligning with UserCreate schema from backend (api/schemas/user_schemas.py)
// UserCreate(UserBase): password: str
// UserBase: username, email, full_name, disabled
export interface FrontendUserCreateData {
    username: string;
    email?: string | null;
    full_name?: string | null;
    password: string;
}


export interface UserResponse { // Corresponds to User schema in backend
    id: number;
    username: string;
    email?: string | null;
    full_name?: string | null;
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

export async function updatePOChecklist(poId: number, checklistStatus: boolean, token: string): Promise<FrontendItemInLayer> {
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
            throw new Error(result.detail || `Failed to update checklist for PO ID ${poId}`);
        }
        return result as FrontendItemInLayer; // Assuming the backend returns the updated PO item
    } catch (error) {
        console.error(`Error in updatePOChecklist for PO ID ${poId}:`, error);
        throw error;
    }
}
