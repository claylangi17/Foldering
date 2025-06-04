"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FrontendItemInLayer, updatePOChecklist, updatePOKeterangan } from "@/lib/api"; // Import updatePOChecklist and updatePOKeterangan
import { useAuth } from "@/context/AuthContext"; // Import useAuth to get token
import { useState, useEffect } from "react"; // To manage local state for immediate feedback
import { Input } from "@/components/ui/input"; // Import Input for Keterangan

export const getItemColumns = (
  currentUserRole: string | undefined,
  onShowDetails: (item: FrontendItemInLayer) => void // Add onShowDetails prop
): ColumnDef<FrontendItemInLayer>[] => {
    console.log(`getItemColumns called with role: ${currentUserRole}`); // Log received role
    // Make comparison case-insensitive
    const isSpv = currentUserRole?.toLowerCase() === 'spv';

    // Define cell component for Checklist - Read-only display
    const ChecklistCell = ({ row }: { row: any }) => {
        const checkedValue = row.getValue("Checklist");
        let displayValue = "-";
        if (typeof checkedValue === 'boolean') {
            displayValue = checkedValue ? "✓" : "✗";
        }
        // Apply color based on value for better visual distinction
        const textColor = checkedValue === true ? "text-green-600" : checkedValue === false ? "text-red-600" : "text-gray-500";
        return <div className={`text-center font-semibold ${textColor}`}>{displayValue}</div>;
    };

    // Define cell component for Keterangan - Read-only display
    const KeteranganCell = ({ row }: { row: any }) => {
        const keteranganValue = row.getValue("Keterangan") as string;
        return <div className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{keteranganValue || "-"}</div>;

    };

    return [
        {
            accessorKey: "PO_NO",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    PO Number <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.getValue("PO_NO") || "-"}</div>,
        },
        {
            accessorKey: "TGL_PO",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    PO Date <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const dateValue = row.getValue("TGL_PO");
                return <div>{dateValue ? new Date(dateValue as string).toLocaleDateString() : "-"}</div>;
            },
        },
        {
            accessorKey: "PO_Status",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    PO Status <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="capitalize">{row.getValue("PO_Status") || "-"}</div>,
        },
        {
            accessorKey: "ITEM",
            header: "Item Code",
            cell: ({ row }) => row.getValue("ITEM") || "-",
        },
        {
            accessorKey: "ITEM_DESC",
            header: "Item Description",
            cell: ({ row }) => <div className="min-w-[200px]">{row.getValue("ITEM_DESC") || "-"}</div>,
        },
        {
            accessorKey: "QTY_ORDER",
            header: "Qty",
            cell: ({ row }) => row.getValue("QTY_ORDER") ?? "-",
        },
        {
            accessorKey: "UNIT",
            header: "Unit",
            cell: ({ row }) => row.getValue("UNIT") || "-",
        },
        {
            accessorKey: "Original_PRICE",
            header: "Price",
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("Original_PRICE") || "0");
                return <div className="text-right">{amount ? amount.toLocaleString() : "-"}</div>;
            },
        },
        {
            accessorKey: "Currency",
            header: "Currency",
            cell: ({ row }) => row.getValue("Currency") || "-",
        },
        {
            accessorKey: "Sum_of_Order_Amount_IDR",
            header: "Total (IDR)",
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("Sum_of_Order_Amount_IDR") || "0");
                const formatted = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                }).format(amount);
                return <div className="text-right font-medium">{amount ? formatted : "-"}</div>;
            },
        },
        {
            accessorKey: "Supplier_Name",
            header: "Supplier",
            cell: ({ row }) => <div className="min-w-[150px]">{row.getValue("Supplier_Name") || "-"}</div>,
        },
        {
            accessorKey: "PR_No",
            header: "PR No",
            cell: ({ row }) => row.getValue("PR_No") || "-",
        },
        {
            accessorKey: "PR_Date",
            header: "PR Date",
            cell: ({ row }) => {
                const dateValue = row.getValue("PR_Date");
                return <div>{dateValue ? new Date(dateValue as string).toLocaleDateString() : "-"}</div>;
            },
        },
        {
            accessorKey: "PR_Ref_A",
            header: "PR Ref A",
            cell: ({ row }) => row.getValue("PR_Ref_A") || "-",
        },
        {
            accessorKey: "PR_Ref_B",
            header: "PR Ref B",
            cell: ({ row }) => row.getValue("PR_Ref_B") || "-",
        },
        {
            accessorKey: "Term_Payment_at_PO",
            header: "Payment Term",
            cell: ({ row }) => row.getValue("Term_Payment_at_PO") || "-",
        },
        {
            accessorKey: "RECEIVED_DATE",
            header: "Received Date",
            cell: ({ row }) => {
                const dateValue = row.getValue("RECEIVED_DATE");
                return <div>{dateValue ? new Date(dateValue as string).toLocaleDateString() : "-"}</div>;
            },
        },
        {
            accessorKey: "Checklist",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Checklist
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ChecklistCell,
            enableSorting: true,
            enableHiding: true,
        },
        {
            accessorKey: "Keterangan",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Keterangan
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: KeteranganCell, // Use the KeteranganCell component
            enableSorting: true,
            enableHiding: true,
        },
        {
            accessorKey: "Cumulative_Item_QTY",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Cum. QTY <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const qty = row.getValue("Cumulative_Item_QTY");
                return <div className="text-right">{typeof qty === 'number' ? qty.toLocaleString() : "-"}</div>;
            },
        },
        {
            accessorKey: "Cumulative_Item_Amount_IDR",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    Cum. Amount (IDR) <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("Cumulative_Item_Amount_IDR") || "0");
                const formatted = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                }).format(amount);
                return <div className="text-right font-medium">{amount ? formatted : "-"}</div>;
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
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
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.PO_NO || "")}>
                                Copy PO Number
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onShowDetails(item)}>
                                View PO Details
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
};
