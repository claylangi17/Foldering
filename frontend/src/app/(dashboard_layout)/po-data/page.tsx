// src/app/(dashboard_layout)/po-data/page.tsx
"use client"; // Data table interactions require client component

import * as React from "react";
import { DataTable } from "@/components/custom/data-table";
import { columns, PurchaseOrder } from "./columns";
import { fetchPurchaseOrders } from "@/lib/api"; // Use the actual API function

export default function PODataPage() {
    const [data, setData] = React.useState<PurchaseOrder[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // TODO: Implement pagination state and pass to fetchPurchaseOrders
    // const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

    React.useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            setError(null);
            try {
                // Example: Fetch first page, 10 items
                const fetchedData = await fetchPurchaseOrders({ page: 1, limit: 10 });
                setData(fetchedData);
            } catch (err: any) {
                console.error("Failed to load PO data:", err);
                setError(err.message || "An unknown error occurred while fetching data.");
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []); // Add dependencies if pagination/filters are added, e.g., [pagination.pageIndex, pagination.pageSize]

    if (isLoading) {
        return <div className="container mx-auto py-10 text-center"><p>Loading Purchase Order Data...</p></div>;
    }

    if (error) {
        return <div className="container mx-auto py-10 text-center text-red-600"><p>Error loading data: {error}</p></div>;
    }

    return (
        <div className="container mx-auto py-10">
            <h1 className="mb-6 text-3xl font-bold">Purchase Order Data</h1>

            {/* Placeholder for Filters and Search (can be integrated into DataTable or be separate components) */}
            {/* <div className="mb-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
        <p className="text-slate-600 dark:text-slate-300">
          Filters (by Layer, Month, etc.) and Search bar will be here.
        </p>
      </div> */}

            <DataTable columns={columns} data={data} />

            {/* Placeholder for Mini Dashboard */}
            <div className="mt-8 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                <h2 className="text-xl font-semibold mb-2">Mini Dashboard</h2>
                <p className="text-slate-600 dark:text-slate-300">
                    Total POs, Total Amount, Category Counts, etc., will be displayed here.
                </p>
            </div>
        </div>
    );
}
