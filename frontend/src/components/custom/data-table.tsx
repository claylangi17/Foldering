"use client";

import * as React from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    PaginationState, // Import PaginationState
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // For global filter/search
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // For column visibility toggle

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    // Props for server-side pagination
    pageCount?: number; // Total number of pages
    pagination?: PaginationState; // Current pagination state { pageIndex, pageSize }
    onPaginationChange?: (updater: PaginationState | ((old: PaginationState) => PaginationState)) => void; // Callback to update pagination state
    manualPagination?: boolean; // Flag to enable manual pagination
    // Props for server-side global search
    globalFilter?: string; // Controlled global filter value
    onGlobalFilterChange?: (value: string) => void; // Handler for global filter changes
    totalDataCount?: number; // Total number of items from the database
    manualGlobalFilter?: boolean;
    enableRowSelection?: boolean;
    onRowSelectionChange?: (updater: any) => void;
    initialColumnVisibility?: VisibilityState;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    manualPagination = false, // Default to client-side pagination
    pagination: controlledPagination, // Renamed to avoid conflict
    onPaginationChange: controlledOnPaginationChange,
    pageCount: controlledPageCount,
    manualGlobalFilter = false,
    globalFilter: controlledGlobalFilter,
    onGlobalFilterChange: controlledOnGlobalFilterChange,
    enableRowSelection = false, // Default to false
    onRowSelectionChange: externalOnRowSelectionChange,
    initialColumnVisibility = {},
    totalDataCount, // Added totalDataCount to destructuring
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);
    const [rowSelection, setRowSelection] = React.useState({});

    // Internal state for global filter, used if external control is not provided
    const [internalGlobalFilter, setInternalGlobalFilter] = React.useState('');

    // Determine global filter state and handler
    const globalFilter = manualGlobalFilter ? controlledGlobalFilter : internalGlobalFilter;
    const setGlobalFilter = manualGlobalFilter ? controlledOnGlobalFilterChange : setInternalGlobalFilter;

    const table = useReactTable({
        data,
        columns,
        // For client-side pagination, provide initialState and let table manage it.
        // For server-side, control it via state and onPaginationChange.
        initialState: {
            pagination: !manualPagination ? { pageIndex: 0, pageSize: 10 } : undefined,
        },
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
            // Only include pagination in state if it's manually controlled (server-side)
            ...(manualPagination && { pagination: controlledPagination }),
        },
        onPaginationChange: manualPagination ? controlledOnPaginationChange : undefined,
        manualPagination: manualPagination,
        pageCount: manualPagination ? controlledPageCount : undefined,

        manualFiltering: manualGlobalFilter, // Tell react-table that global filtering is manual
        
        // Core models
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(), // For client-side sorting
        // Conditionally provide getFilteredRowModel. If filtering is manual, table shouldn't use its own.
        ...(!manualGlobalFilter && { getFilteredRowModel: getFilteredRowModel() }),
        getPaginationRowModel: getPaginationRowModel(), // For client-side pagination if manualPagination is false

        // Event handlers for controlled state
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: enableRowSelection ? (externalOnRowSelectionChange || setRowSelection) : undefined,
        onGlobalFilterChange: setGlobalFilter,
    });

    return (
        <div>
            {/* Global Search and Column Visibility Toggle */}
            <div className="flex items-center py-4">
                <Input
                    placeholder="Search all columns..."
                    value={globalFilter ?? ""}
                    onChange={(event) => {
                        if (typeof setGlobalFilter === 'function') {
                            setGlobalFilter(event.target.value);
                        }
                    }}
                    className="max-w-sm"
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Columns
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => {
                                const isChecked = (row.original as any)?.Checklist === true || (row.original as any)?.Checklist === 1;
                                return (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={isChecked ? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800/40" : "hover:bg-muted/50"}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                    {enableRowSelection && (
                        <>
                            {table.getFilteredSelectedRowModel().rows.length} of{" "}
                            {table.getFilteredRowModel().rows.length} row(s) selected.
                        </>
                    )}
                    {/* Always show total items if available and pagination is manual, regardless of row selection status */}
                    {typeof totalDataCount === 'number' && manualPagination && (
                        <span className={enableRowSelection ? "ml-2" : ""}> {/* Adjust margin if selection text is hidden */}
                            (Total: {totalDataCount} items)
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {manualPagination && table.getPageCount() > 0 && table.getState().pagination && (
                        <span className="text-sm text-muted-foreground">
                            Page {table.getState().pagination!.pageIndex + 1} of {table.getPageCount()}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
