// src/app/(dashboard_layout)/po-data/page.tsx
"use client"; // Data table interactions require client component

import * as React from "react";
import { DataTable } from "@/components/custom/data-table";
import { columns, PurchaseOrder } from "./columns"; 
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { PaginationState } from '@tanstack/react-table'; // For DataTable pagination state
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component
import { PODetailsModalSimple } from "@/components/custom/po-details-modal-simple"; // Using SimpleModal instead of Radix Dialog to fix freezing
import { Input } from "@/components/ui/input";
import { fetchPurchaseOrders } from "@/lib/api"; // Import the updated fetchPurchaseOrders
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon } from 'lucide-react';

export default function PODataPage() {
  const { token, user } = useAuth(); // Get token and user from AuthContext
  const [data, setData] = React.useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedPO, setSelectedPO] = React.useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Server-side search state
  const [searchQuery, setSearchQuery] = React.useState(''); // Immediate search input
  const [searchByColumn, setSearchByColumn] = React.useState<string>('ALL'); // Default search column
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState(''); // Debounced search query for API

  // Server-side pagination state
  const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
    pageIndex: 0, // Initial page index
    pageSize: 10, // Default page size
  });
  const [pageCount, setPageCount] = React.useState(0); // Total number of pages
  const [totalDataCount, setTotalDataCount] = React.useState(0); // Total items from DB

  // Define defaultData with useMemo at the top level of the component
  const defaultData = React.useMemo(() => [], []);

  // Prepare PO data with view details action handler
  const dataWithViewAction = React.useMemo(() => {
    if (!data) return [];
    
    return data.map(po => ({
      ...po,
      _showDetails: () => {
        setSelectedPO(po);
        setIsModalOpen(true);
      }
    }));
  }, [data]);

  // Handle PO update from modal
  const handlePOUpdate = React.useCallback((updatedPO: any) => {
    if (!data) return;
    
    // Update local data with updated PO information
    const updatedData = data.map(po => {
      if (po.id === updatedPO.id) {
        return {
          ...po,
          Checklist: updatedPO.Checklist,
          Keterangan: updatedPO.Keterangan
        };
      }
      return po;
    });
    
    setData(updatedData);
    
    // Update the selected PO if it's still open
    if (selectedPO && selectedPO.id === updatedPO.id) {
      setSelectedPO({
        ...selectedPO,
        Checklist: updatedPO.Checklist,
        Keterangan: updatedPO.Keterangan
      });
    }
  }, [data, selectedPO]);

  // Effect for debouncing search query
  React.useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      // Reset to first page when search query changes
      setPagination(prev => ({ ...prev, pageIndex: 0 })); 
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchQuery]);

  const searchableColumnsConfig: { value: string; label: string }[] = React.useMemo(() => [
    { value: 'ALL', label: 'All Fields' },
    { value: 'PO_NO', label: 'PO Number' },
    { value: 'ITEM_DESC', label: 'Item Desc' },
    { value: 'Supplier_Name', label: 'Supplier' },
    { value: 'PR_No', label: 'PR Number' },
    { value: 'PO_Status', label: 'PO Status' },
    { value: 'Total_Cumulative_QTY_Order', label: 'Total Quantity' },
    { value: 'Sum_of_Order_Amount_IDR', label: 'Amount' },
    { value: 'Original_PRICE', label: 'Unit Price' },
    { value: 'Checklist', label: 'Checklist (True/False)' },
    { value: 'Keterangan', label: 'Keterangan' }
  ], []);

  React.useEffect(() => {
    async function fetchData(currentPageIndex: number, currentPageSize: number, currentSearchQuery: string, currentSearchColumn: string) {
      if (!token) { // Removed user?.company_code check as it's not used by fetchPurchaseOrders directly
        setError("Authentication token is missing.");
        setIsLoading(false);
        return;
      }

      console.log(`PODataPage: Fetching data. Page: ${currentPageIndex + 1}, Size: ${currentPageSize}, Search: '${currentSearchQuery}', Column: '${currentSearchColumn}'`);
      setIsLoading(true);
      setError(null);

      try {
        // Use the centralized fetchPurchaseOrders function
        const result = await fetchPurchaseOrders(token, {
          page: currentPageIndex + 1, // fetchPurchaseOrders expects 1-based page index
          limit: currentPageSize,
          search_value: currentSearchQuery,
          search_field: currentSearchColumn
        });

        console.log("API response items:", result.items);
        setData(result.items);
        setTotalDataCount(result.total);
        setPageCount(Math.ceil(result.total / currentPageSize));
        console.log("PODataPage: Data fetched successfully", result);

      } catch (err: any) {
        console.error("PODataPage: Error fetching data", err);
        setError(err.message || "An unknown error occurred");
        setData([]); // Clear data on error
        setPageCount(0); // Reset page count on error
        setTotalDataCount(0); // Reset total data count on error
      }
      setIsLoading(false);
    }

    if (token && user?.company_code) {
        fetchData(pageIndex, pageSize, debouncedSearchQuery, searchByColumn);
    } else if (!isLoading && !token) {
        // If still loading, wait. If not loading and no token, it implies auth state is resolved.
        // Layout should handle redirect to login if not authenticated.
        // Setting an error here might be redundant if redirect occurs.
        console.log("PODataPage: Waiting for token or user context.");
    }

  }, [token, user?.company_code, pageIndex, pageSize, debouncedSearchQuery, searchByColumn]); // Re-fetch if pagination or debouncedSearchQuery changes

  if (isLoading) {
    // Create a simple skeleton loader that mimics the table structure
    const skeletonRows = Array.from({ length: pageSize }, (_, i) => (
      <div key={`skeleton-row-${i}`} className="flex items-center space-x-4 p-4 border-b">
        <Skeleton className="h-5 w-5 rounded-sm" /> {/* Checkbox skeleton */}
        <Skeleton className="h-4 w-[100px]" /> {/* PO Number */}
        <Skeleton className="h-4 w-[120px]" /> {/* PO Date */}
        <Skeleton className="h-4 flex-1" />    {/* Item Description */}
        <Skeleton className="h-4 w-[60px]" />  {/* Qty Order */}
        <Skeleton className="h-4 w-[150px]" /> {/* Supplier */}
        <Skeleton className="h-4 w-[100px]" /> {/* Total Amount */}
        <Skeleton className="h-4 w-[60px]" />  {/* Checklist */}
        <Skeleton className="h-4 w-[80px]" />  {/* Keterangan */}
      </div>
    ));

    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6 text-center">Purchase Order Data</h1>
        {/* Skeleton for search bar and columns button */}
        <div className="flex items-center py-4">
          <Skeleton className="h-10 w-full max-w-sm" />
          <Skeleton className="h-10 w-[100px] ml-auto" />
        </div>
        <div className="rounded-md border">
          {/* Header-like skeletons (optional, could be simpler) */}
          <div className="flex items-center space-x-4 p-4 border-b bg-muted/50">
            <Skeleton className="h-5 w-5 rounded-sm opacity-50" />
            <Skeleton className="h-4 w-[100px] opacity-50" />
            <Skeleton className="h-4 w-[120px] opacity-50" />
            <Skeleton className="h-4 flex-1 opacity-50" />
            <Skeleton className="h-4 w-[60px] opacity-50" />
            <Skeleton className="h-4 w-[150px] opacity-50" />
            <Skeleton className="h-4 w-[100px] opacity-50" />
            <Skeleton className="h-4 w-[60px] opacity-50" />
            <Skeleton className="h-4 w-[80px] opacity-50" />
          </div>
          {skeletonRows}
        </div>
        {/* Skeleton for pagination controls */}
        <div className="flex items-center justify-end space-x-2 py-4">
            <Skeleton className="h-8 w-[150px]" />
            <Skeleton className="h-8 w-[80px]" />
            <Skeleton className="h-8 w-[80px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto py-10 text-center text-red-600"><p>Error loading data: {error}</p></div>;
  }

  // Handle empty state after loading and no error
  if (data.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6 text-center">Purchase Order Data</h1>
        {/* Keep search bar and columns button visible for new searches/filter adjustments */}
        {/* Search and Filter UI */}
        <div className="flex items-center py-4 space-x-2">
          <Select value={searchByColumn} onValueChange={setSearchByColumn}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Search by..." />
            </SelectTrigger>
            <SelectContent>
              {searchableColumnsConfig.map(col => (
                <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder={`Search ${searchableColumnsConfig.find(c => c.value === searchByColumn)?.label || 'All Fields'}...`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>
        <DataTable 
          columns={columns} 
          data={[]} // Pass empty data
          pageCount={0}
          pagination={{ pageIndex, pageSize }}
          onPaginationChange={setPagination}
          manualPagination
          // globalFilter and onGlobalFilterChange removed as we handle it externally
          totalDataCount={totalDataCount} // Pass totalDataCount
          manualGlobalFilter={true} // Indicate that global filtering is handled server-side
          // Custom empty state message will be shown by DataTable or we can add one here
        />
        <div className="text-center py-10">
          {debouncedSearchQuery ? (
            <p className="text-lg text-gray-600">
              Tidak ada Purchase Order yang cocok dengan pencarian "<strong>{debouncedSearchQuery}</strong>".
            </p>
          ) : (
            <p className="text-lg text-gray-600">Belum ada data Purchase Order yang tersedia.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Purchase Order Data</h1>
      {/* Search and Filter UI */}
      <div className="flex items-center py-4 space-x-2">
        <Select value={searchByColumn} onValueChange={(value) => {
          setSearchByColumn(value);
          setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page on column change
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Search by..." />
          </SelectTrigger>
          <SelectContent>
            {searchableColumnsConfig.map(col => (
              <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-grow">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder={`Search ${searchableColumnsConfig.find(c => c.value === searchByColumn)?.label || 'All Fields'}...`}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value) }
              className="pl-8 w-full"
            />
        </div>
      </div>
      <DataTable 
        columns={columns} 
        data={dataWithViewAction ?? defaultData} 
        pageCount={pageCount}
        pagination={{ pageIndex, pageSize }}
        onPaginationChange={setPagination} // Allows DataTable to update our pagination state
        manualPagination // Important for server-side pagination
        // globalFilter and onGlobalFilterChange removed as we handle it externally
        manualGlobalFilter={true} // Indicate that global filtering is handled server-side
        totalDataCount={totalDataCount} // Total number of items across all pages
      />
      
      {/* PO Details Modal - Using SimpleModal implementation to fix UI freezing */}
      {selectedPO && (
        <>
          {console.log("[PODataPage] Rendering modal. User:", user, "isSPV check:", user?.role === 'SPV')}
        <PODetailsModalSimple
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedPO={selectedPO}
          onItemUpdated={handlePOUpdate}
          isSPV={user?.role === 'SPV'}
          showCumulativeData={false} // Explicitly set to false for PO Data page
        />
        </>
      )}
    </div>
  );
}
