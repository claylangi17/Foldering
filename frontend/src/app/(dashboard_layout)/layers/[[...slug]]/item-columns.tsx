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

export const getItemColumns = (currentUserRole: string | undefined): ColumnDef<FrontendItemInLayer>[] => {
    console.log(`getItemColumns called with role: ${currentUserRole}`); // Log received role
    // Make comparison case-insensitive
    const isSpv = currentUserRole?.toLowerCase() === 'spv';

    // Define cell component for Checklist - now accepts isSpv as a prop
    const ChecklistCell = ({ row, isSpvProp }: { row: any; isSpvProp: boolean }) => {
        const { token } = useAuth();
        const poId = row.original?.id; // Still attempting to get ID
        const initialChecked = !!row.getValue("Checklist");
        const [isChecked, setIsChecked] = useState(initialChecked);
        const [isUpdating, setIsUpdating] = useState(false);

        // Debugging logs
        console.log(`ChecklistCell Render - Row Original:`, row.original);
        // Use the isSpvProp prop received by the component
        console.log(`ChecklistCell Render: PO ID ${poId}, isSpv=${isSpvProp}, hasToken=${!!token}, initialChecked=${initialChecked}`);

        const handleCheckedChange = async (value: boolean | "indeterminate") => {
            // Use the isSpvProp prop
            console.log(`Checklist Changed: PO ID ${poId}, New Value=${value}, isSpv=${isSpvProp}, hasToken=${!!token}`);
            if (typeof value === 'boolean' && isSpvProp && token && poId) {
                setIsUpdating(true);
                try {
                    setIsChecked(value);
                    console.log(`Calling updatePOChecklist for PO ID ${poId} with value ${value}`);
                    await updatePOChecklist(poId, value, token);
                    console.log(`Checklist for PO ID ${poId} updated successfully to ${value}`);
                } catch (error) {
                    console.error(`Failed to update checklist for PO ID ${poId}:`, error);
                    setIsChecked(!value);
                    alert(`Error updating checklist: ${(error as Error).message}`);
                } finally {
                    setIsUpdating(false);
                }
            } else if (!poId) {
                console.error("Cannot update checklist: PO ID is missing from row data.");
            } else if (!isSpvProp) {
                 console.warn("Checklist change ignored: User is not SPV.");
            }
        };

        return (
            <Checkbox
                checked={isChecked}
                aria-label="Checklist status"
                disabled={!isSpvProp || isUpdating} // Use isSpvProp prop
                onCheckedChange={handleCheckedChange}
            />
        );
    };

    // Define cell component for Keterangan to use hooks and manage its state
    const KeteranganCell = ({ row }: { row: any }) => {
        const { token } = useAuth();
        const initialKeterangan = row.getValue("Keterangan") || "";
        const [keterangan, setKeterangan] = useState(initialKeterangan);
        const [isUpdating, setIsUpdating] = useState(false);
        const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

        useEffect(() => {
            // Update local state if the row data changes externally
            setKeterangan(row.getValue("Keterangan") || "");
        }, [row.getValue("Keterangan")]);

        const handleKeteranganChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = event.target.value;
            setKeterangan(newValue);

            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }

            if (currentUserRole?.toLowerCase() === 'spv' && token) {
                const timeout = setTimeout(async () => {
                    setIsUpdating(true);
                    try {
                        // Ensure row.original.id exists before calling API
                        const poIdForKeterangan = row.original?.id;
                        if (!poIdForKeterangan) {
                             console.error("Cannot update Keterangan: PO ID is missing.");
                             alert("Error: Cannot update Keterangan, item ID is missing.");
                             // Optionally revert keterangan state here
                             setIsUpdating(false);
                             return;
                        }
                        await updatePOKeterangan(poIdForKeterangan, newValue, token);
                        console.log(`Keterangan for PO ID ${poIdForKeterangan} updated to ${newValue}`);
                    } catch (error) {
                        console.error(`Failed to update Keterangan for PO ID ${row.original?.id}:`, error);
                        alert(`Error updating Keterangan: ${(error as Error).message}`);
                    } finally {
                        setIsUpdating(false);
                    }
                }, 1000); // Debounce time: 1 second
                setDebounceTimeout(timeout);
            }
        };

        return (
            <Input
                value={keterangan}
                onChange={handleKeteranganChange}
                disabled={currentUserRole?.toLowerCase() !== 'spv' || isUpdating}
                placeholder="Add notes..."
                className="max-w-[200px]"
            />
        );

    };

    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && "indeterminate")
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                    className="translate-y-[2px]"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "PO_No",
            header: ({ column }) => (
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                    PO Number <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => <div className="font-medium">{row.getValue("PO_No") || "-"}</div>,
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
            // Pass the calculated isSpv from getItemColumns scope as a prop
            cell: ({ row }) => <ChecklistCell row={row} isSpvProp={isSpv} />,
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
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.PO_No || "")}>
                                Copy PO Number
                            </DropdownMenuItem>
                            {/* Add more actions later, e.g., edit checklist/keterangan */}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
};
