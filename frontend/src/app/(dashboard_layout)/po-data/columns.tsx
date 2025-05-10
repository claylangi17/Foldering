"use client"; // Required for event handlers and hooks in client components

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming we'll use this for row selection
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
    PO_No: string;
    TGL_PO: string | Date; // Or Date if parsed
    ITEM_NAME: string; // Or ITEM_DESC
    QTY_ORDER: number;
    Supplier_Name?: string;
    IDR_PRICE?: number;
    UNIT?: string;
    PR_Date?: string | Date;
    PR_Ref_A?: string;
    PR_Ref_B?: string;
    Term_Payment?: string;
    RECEIVED_DATE?: string | Date;
    Sum_of_Order_Amount_IDR?: number;
    Total_Cumulative_QTY_Order?: number;
    Total_Cumulative_IDR_Amount?: number;
    Checklist: boolean;
    Keterangan: string;
    // Add other fields from your PO data as needed
};

export const columns: ColumnDef<PurchaseOrder>[] = [
    {
        id: "select",
        header: ({ table }: { table: any }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }: { row: any }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "PO_No",
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
        accessorKey: "ITEM_NAME", // Or ITEM_DESC
        header: "Item Name",
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
        // Potentially make this cell editable or show a snippet with a modal for full text
        cell: ({ row }: { row: any }) => <div className="truncate max-w-xs">{row.getValue("Keterangan") || "-"}</div>,
    },
    // Add more columns for:
    // PR_No, IDR_PRICE, UNIT, PR Date, PR Ref-A, PR Ref-B, Term_Payment, RECEIVED_DATE
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
                            onClick={() => navigator.clipboard.writeText(po.PO_No)}
                        >
                            Copy PO Number
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>View PO Details</DropdownMenuItem>
                        <DropdownMenuItem>Edit PO (Checklist/Keterangan)</DropdownMenuItem>
                        {/* Add more actions as needed */}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
