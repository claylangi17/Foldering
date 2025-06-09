"use client"; // Required for event handlers and hooks in client components

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Assuming we'll use this for row selection
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// This type is a placeholder for the data structure of a Purchase Order.
// You'll want to import a more specific type from your API schemas or define it here.
// For now, using a generic structure based on mock data and requirements.
export type PurchaseOrder = {
    id: string | number; // Assuming 'id' is the unique identifier from your DB for the PO row
    PO_NO: string; // Changed from PO_No to PO_NO to match API response key
    TGL_PO: string | Date; // Or Date if parsed
    ITEM?: string; // From backend schema
    ITEM_DESC?: string; // From backend schema, preferred for display
    QTY_ORDER: number;
    Supplier_Name?: string;
    Original_PRICE?: number; // Changed from IDR_PRICE to match DB/Pydantic schema
    UNIT?: string;
    PR_Date?: string | Date;
    PR_No?: string; // Added to match DB/Pydantic schema for PR Number column
    PR_Ref_A?: string; // Kept if used elsewhere, but PR_No is primary for the column
    PR_Ref_B?: string;
    Term_Payment?: string;
    RECEIVED_DATE?: string | Date;
    Sum_of_Order_Amount_IDR?: number;
    Total_Cumulative_QTY_Order?: number;
    Total_Cumulative_IDR_Amount?: number;
    Checklist: boolean;
    Keterangan: string;
    PO_Status?: string; // Added PO Status
    // Add other fields from your PO data as needed
};

export const columns: ColumnDef<PurchaseOrder>[] = [
    {
        accessorKey: "PO_NO", // Changed from PO_No to PO_NO to match API response key
        header: ({ column }: { column: any }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    PO Number
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
    },
    {
        accessorKey: "TGL_PO",
        header: ({ column }: { column: any }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    PO Date
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            );
        },
        cell: ({ row }: { row: any }) => {
            const date = row.getValue("TGL_PO");
            // Format date as needed, e.g., using date-fns or Intl.DateTimeFormat
            const formatted = typeof date === 'string' ? date : (date instanceof Date ? date.toLocaleDateString() : 'N/A');
            return <div className="font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "ITEM_DESC", // Changed from ITEM_NAME to match backend schema (ITEM_DESC or ITEM)
        header: "Item Description", // Updated header for clarity
    },
    {
        accessorKey: "QTY_ORDER",
        header: "Qty Order",
    },
    {
        accessorKey: "Supplier_Name",
        header: "Supplier",
    },
    {
        accessorKey: "Sum_of_Order_Amount_IDR",
        header: "Total Amount (IDR)",
        cell: ({ row }: { row: any }) => {
            const amount = parseFloat(row.getValue("Sum_of_Order_Amount_IDR") || "0");
            const formatted = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "Checklist",
        header: "Checklist",
        cell: ({ row }: { row: any }) => {
            // This could be an editable checkbox later
            return row.getValue("Checklist") ? "✔️" : "❌";
        }
    },
    {
        accessorKey: "Keterangan",
        header: "Keterangan",
        cell: ({ row }: { row: any }) => {
            const keterangan = row.original.Keterangan;
            return keterangan ? (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-pointer flex items-center justify-center">
                                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-background text-foreground border shadow-lg rounded-md p-2 break-words">
                            <p>{keterangan}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                <span className="flex items-center justify-center">-</span>
            );
        },
    },
    {
        accessorKey: "PR_No", // Changed from PR_Ref_A to match DB/Pydantic schema
        header: "PR Number",
    },
    {
        accessorKey: "Original_PRICE", // Changed from IDR_PRICE to match DB/Pydantic schema
        header: "Unit Price (IDR)",
        cell: ({ row }: { row: any }) => {
            const amount = parseFloat(row.getValue("Original_PRICE") || "0"); // Changed from IDR_PRICE
            const formatted = new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "UNIT",
        header: "Unit",
    },
    {
        accessorKey: "PO_Status",
        header: "PO Status",
    },
    // Add more columns for:
    // PR_Date, PR_Ref_B, Term_Payment, RECEIVED_DATE
    // Total_Cumulative_QTY_Order, Total_Cumulative_IDR_Amount
    {
        id: "actions",
        cell: ({ row }: { row: any }) => {
            const po = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(po.PO_NO)}
                        >
                            Copy PO Number
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => row.original._showDetails?.()}
                        >
                            View PO Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {/* <DropdownMenuItem>Edit PO (Checklist/Keterangan)</DropdownMenuItem> */}
                        {/* Add more actions as needed */}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
